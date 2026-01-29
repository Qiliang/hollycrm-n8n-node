import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);

function getExtensionForFormat(format: string): string {
	const map: Record<string, string> = {
		markdown: 'md', markdown_strict: 'md', markdown_phpextra: 'md', markdown_mmd: 'md',
		gfm: 'md', commonmark: 'md', commonmark_x: 'md',
		plain: 'txt', text: 'txt', html: 'html', html5: 'html', rst: 'rst', latex: 'tex',
		docx: 'docx', pptx: 'pptx', xlsx: 'xlsx', json: 'json', pdf: 'pdf', odt: 'odt', epub: 'epub',
		asciidoc: 'adoc', docbook: 'xml', org: 'org', mediawiki: 'mediawiki', textile: 'textile', jira: 'jira',
	};
	return map[format] || format;
}

/** 输入格式选项值 -> pandoc -f 参数（空为自动检测） */
function toPandocInputFormat(uiValue: string): string {
	if (!uiValue || uiValue === '自动') return '';
	if (uiValue === 'text') return 'plain';
	return uiValue;
}

/** 输出格式选项值 -> pandoc -t 参数 */
function toPandocOutputFormat(uiValue: string): string {
	if (uiValue === 'text') return 'plain';
	return uiValue;
}

export class Pandoc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pandoc',
		name: 'hollycrm_pandoc',
		icon: 'file:pandoc.svg',
		group: ['transform'],
		version: 1,
		subtitle: '文档格式转换',
		description: '使用 Pandoc 命令行将二进制文档转换为指定格式，通过 PANDOC_PATH 环境变量指定可执行路径',
		defaults: {
			name: 'Pandoc',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: '输入源',
				name: 'inputSource',
				type: 'options',
				options: [
					{ name: '二进制数据', value: 'binary' },
					{ name: '文本内容', value: 'text' },
				],
				default: 'binary',
				description: '选择输入数据的来源',
			},
			{
				displayName: '二进制属性名',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: '包含待转换文档的二进制属性名称',
				displayOptions: {
					show: {
						inputSource: ['binary'],
					},
				},
			},
			{
				displayName: '文本内容',
				name: 'textContent',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				description: '要转换的文本内容，支持表达式',
				displayOptions: {
					show: {
						inputSource: ['text'],
					},
				},
			},
			{
				displayName: '输入格式',
				name: 'fromFormat',
				type: 'options',
				options: [
					{ name: '自动', value: '自动' },
					{ name: 'docx', value: 'docx' },
					{ name: 'pptx', value: 'pptx' },
					{ name: 'xlsx', value: 'xlsx' },
					{ name: 'json', value: 'json' },
					{ name: 'html', value: 'html' },
					{ name: 'text', value: 'text' },
					{ name: 'markdown', value: 'markdown' },
				],
				default: '自动',
				description: '输入文档格式，选“自动”时根据文件扩展名推断',
			},
			{
				displayName: '输出格式',
				name: 'toFormat',
				type: 'options',
				options: [
					{ name: 'markdown', value: 'markdown' },
					{ name: 'text', value: 'text' },
					{ name: 'docx', value: 'docx' },
				],
				default: 'markdown',
				description: '输出文档格式',
			},
			{
				displayName: '输出为文本时的字段名',
				name: 'outputFieldName',
				type: 'string',
				default: 'text',
				description: '当输出格式为文本（如 markdown、html）时，存放结果的 JSON 字段名',
				displayOptions: {
					hide: {
						toFormat: ['docx'],
					},
				},
			},
			{
				displayName: '输出二进制属性名',
				name: 'outputBinaryPropertyName',
				type: 'string',
				default: 'data',
				description: '输出二进制文件的属性名称',
				displayOptions: {
					show: {
						toFormat: ['docx'],
					},
				},
			},
			{
				displayName: '额外参数',
				name: 'extraArgs',
				type: 'string',
				default: '',
				placeholder: '如 --standalone --toc',
				description: '追加给 pandoc 的额外命令行参数（用空格分隔）',
			},
			{
				displayName: '透传上游数据',
				name: 'passthroughData',
				type: 'boolean',
				default: true,
				description: '是否将上游节点的 JSON 数据合并到输出中',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const pandocPath = process.env.PANDOC_PATH || 'pandoc';
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const inputSource = this.getNodeParameter('inputSource', i) as string;
			const fromFormatUi = this.getNodeParameter('fromFormat', i) as string;
			const toFormatUi = this.getNodeParameter('toFormat', i) as string;
			const extraArgsStr = (this.getNodeParameter('extraArgs', i) as string).trim();
			const passthroughData = this.getNodeParameter('passthroughData', i) as boolean;

			const fromFormat = toPandocInputFormat(fromFormatUi);
			const toFormat = toPandocOutputFormat(toFormatUi);

			let buffer: Buffer;
			let inputExt: string;

			if (inputSource === 'binary') {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				if (!buffer || buffer.length === 0) {
					throw new NodeOperationError(this.getNode(), '二进制数据为空', { itemIndex: i });
				}
				inputExt = fromFormat
					? getExtensionForFormat(fromFormatUi)
					: (binaryData.fileName?.split('.').pop() || 'bin');
			} else {
				const textContent = this.getNodeParameter('textContent', i) as string;
				if (!textContent) {
					throw new NodeOperationError(this.getNode(), '文本内容为空', { itemIndex: i });
				}
				buffer = Buffer.from(textContent, 'utf-8');
				inputExt = fromFormat ? getExtensionForFormat(fromFormatUi) : 'txt';
			}
			const outputExt = getExtensionForFormat(toFormat);
			const prefix = `n8n-pandoc-${Date.now()}-${i}`;
			const inputPath = join(tmpdir(), `${prefix}-in.${inputExt}`);
			const outputPath = join(tmpdir(), `${prefix}-out.${outputExt}`);

			try {
				await writeFile(inputPath, buffer, { mode: 0o600 });

				const args: string[] = [];
				if (fromFormat) {
					args.push('-f', fromFormat);
				}
				args.push('-t', toFormat);
				if (extraArgsStr) {
					args.push(...extraArgsStr.split(/\s+/).filter(Boolean));
				}
				args.push(inputPath, '-o', outputPath);

				await execFileAsync(pandocPath, args, { timeout: 120000 });

				// 判断是否为二进制输出格式
				const isBinaryOutput = ['docx', 'pptx', 'xlsx', 'pdf', 'odt', 'epub'].includes(toFormat);

				if (isBinaryOutput) {
					const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i) as string;
					const outputBuffer = await readFile(outputPath);
					const binaryData = await this.helpers.prepareBinaryData(
						outputBuffer,
						`output.${outputExt}`,
					);
					const outputJson = passthroughData ? { ...items[i].json } : {};
					const executionData = this.helpers.constructExecutionMetaData(
						[{ json: outputJson, binary: { [outputBinaryPropertyName]: binaryData } }],
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				} else {
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
					const content = await readFile(outputPath, 'utf-8');
					const outputJson = passthroughData
						? { ...items[i].json, [outputFieldName]: content }
						: { [outputFieldName]: content };
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(outputJson),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			} finally {
				await unlink(inputPath).catch(() => {});
				await unlink(outputPath).catch(() => {});
			}
		}

		return [returnData];
	}
}
