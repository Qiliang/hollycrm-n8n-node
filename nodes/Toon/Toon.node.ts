import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { encode, decode, type EncodeOptions, type DecodeOptions } from '@toon-format/toon';

/**
 * 估算 Token 数量
 * 使用简单启发式方法：约 4 个字符 = 1 个 Token
 */
function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * 过滤对象，只保留指定的字段
 */
function filterFields(data: unknown, fields: string[]): unknown {
	if (Array.isArray(data)) {
		return data.map(item => filterFields(item, fields));
	}
	if (data !== null && typeof data === 'object') {
		const filtered: IDataObject = {};
		for (const field of fields) {
			const trimmedField = field.trim();
			if (trimmedField in (data as IDataObject)) {
				filtered[trimmedField] = (data as IDataObject)[trimmedField];
			}
		}
		return filtered;
	}
	return data;
}

/**
 * 将 JSON 转换为 TOON
 */
function convertJsonToToon(
	context: IExecuteFunctions,
	data: unknown,
): { toon: string; tokenMetrics?: IDataObject } {
	const encodeOptions = context.getNodeParameter('encodeOptions', 0, {}) as IDataObject;

	const indent = (encodeOptions.indent as number) ?? 2;
	const delimiterValue = (encodeOptions.delimiter as string) ?? ',';
	const keyFolding = (encodeOptions.keyFolding as 'off' | 'safe') ?? 'off';
	const flattenDepth = keyFolding === 'safe'
		? ((encodeOptions.flattenDepth as number) ?? 999)
		: Infinity;
	const includeTokenMetrics = (encodeOptions.includeTokenMetrics as boolean) ?? false;
	const selectedFields = (encodeOptions.selectedFields as string) ?? '';

	// 如果指定了字段选择，过滤数据
	let processedData = data;
	if (selectedFields.trim()) {
		const fields = selectedFields.split(',').map(f => f.trim()).filter(f => f);
		if (fields.length > 0) {
			processedData = filterFields(data, fields);
		}
	}

	// 构建编码选项
	const options: EncodeOptions = {
		indent,
		delimiter: delimiterValue as ',' | '\t' | '|',
	};

	if (keyFolding !== 'off') {
		options.keyFolding = keyFolding;
		options.flattenDepth = flattenDepth === 999 ? Infinity : flattenDepth;
	}

	const toonOutput = encode(processedData, options);

	let tokenMetrics: IDataObject | undefined;
	if (includeTokenMetrics) {
		const jsonString = JSON.stringify(processedData);
		const jsonTokens = estimateTokenCount(jsonString);
		const toonTokens = estimateTokenCount(toonOutput);
		const saved = jsonTokens - toonTokens;
		const reduction = jsonTokens > 0 ? saved / jsonTokens : 0;

		tokenMetrics = {
			jsonTokens,
			toonTokens,
			savedTokens: saved,
			reduction: `${Math.round(reduction * 100)}%`,
		};
	}

	return { toon: toonOutput, tokenMetrics };
}

/**
 * 将 TOON 转换为 JSON
 */
function convertToonToJson(
	context: IExecuteFunctions,
	toonText: string,
): unknown {
	if (typeof toonText !== 'string') {
		throw new NodeOperationError(
			context.getNode(),
			'TOON 转 JSON 的输入必须是字符串',
		);
	}

	const decodeOptions = context.getNodeParameter('decodeOptions', 0, {}) as IDataObject;

	const strict = (decodeOptions.strict as boolean) ?? true;
	const expandPaths = (decodeOptions.expandPaths as 'off' | 'safe') ?? 'off';

	const options: DecodeOptions = {};

	if (strict !== true) {
		options.strict = strict;
	}
	if (expandPaths !== 'off') {
		options.expandPaths = expandPaths;
	}

	return decode(toonText, options);
}

export class Toon implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TOON',
		name: 'hollycrm_toon',
		icon: 'file:toon.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] === "jsonToToon" ? "JSON → TOON" : "TOON → JSON" }}',
		description: 'JSON 与 TOON 格式互转，TOON 是一种面向 Token 优化的对象表示法，可减少约 40% 的 Token 消耗',
		defaults: {
			name: 'TOON',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'JSON 转 TOON',
						value: 'jsonToToon',
						description: '将所有输入数据转换为 TOON 格式',
						action: '将 JSON 转换为 TOON',
					},
					{
						name: 'TOON 转 JSON',
						value: 'toonToJson',
						description: '将 TOON 格式解析为 JSON',
						action: '将 TOON 转换为 JSON',
					},
				],
				default: 'jsonToToon',
			},
			{
				displayName: 'TOON 数据',
				name: 'toonInput',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				displayOptions: {
					show: {
						operation: ['toonToJson'],
					},
				},
				description: '输入要解析的 TOON 格式文本',
				placeholder: 'users[2]{id,name,role}:\n  1,Alice,admin\n  2,Bob,user',
			},
			{
				displayName: '输出字段',
				name: 'outputField',
				type: 'string',
				default: 'data',
				description: '存储转换结果的字段名',
			},
			// JSON 转 TOON 的选项
			{
				displayName: '高级选项',
				name: 'encodeOptions',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						operation: ['jsonToToon'],
					},
				},
				options: [
					{
						displayName: '字段选择',
						name: 'selectedFields',
						type: 'string',
						default: '',
						placeholder: 'id,name,email',
						description: '只包含指定的字段（用逗号分隔），留空表示包含所有字段',
					},
					{
						displayName: '分隔符',
						name: 'delimiter',
						type: 'options',
						options: [
							{ name: '逗号 (,)', value: ',' },
							{ name: '制表符 (Tab)', value: '\t' },
							{ name: '竖线 (|)', value: '|' },
						],
						default: ',',
						description: '数组值的分隔符',
					},
					{
						displayName: '缩进大小',
						name: 'indent',
						type: 'number',
						default: 2,
						description: '每级缩进的空格数',
					},
					{
						displayName: '键折叠',
						name: 'keyFolding',
						type: 'options',
						options: [
							{ name: '关闭', value: 'off' },
							{ name: '安全模式', value: 'safe' },
						],
						default: 'off',
						description: '将单键对象链折叠为点分路径（如 "a.b.c"）',
					},
					{
						displayName: '折叠深度',
						name: 'flattenDepth',
						type: 'number',
						default: 999,
						description: '最大折叠段数（999 表示无限制）',
						displayOptions: {
							show: {
								keyFolding: ['safe'],
							},
						},
					},
					{
						displayName: '包含 Token 统计',
						name: 'includeTokenMetrics',
						type: 'boolean',
						default: false,
						description: '是否在输出中包含 Token 数量对比统计',
					},
				],
			},
			// TOON 转 JSON 的选项
			{
				displayName: '高级选项',
				name: 'decodeOptions',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						operation: ['toonToJson'],
					},
				},
				options: [
					{
						displayName: '展开路径',
						name: 'expandPaths',
						type: 'options',
						options: [
							{ name: '关闭', value: 'off' },
							{ name: '安全模式', value: 'safe' },
						],
						default: 'off',
						description: '将点分键拆分为嵌套对象（如 "a.b.c" → {a: {b: {c: ...}}}）',
					},
					{
						displayName: '严格模式',
						name: 'strict',
						type: 'boolean',
						default: true,
						description: '是否强制执行数组计数、缩进倍数和验证规则',
					},
				],
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const outputField = this.getNodeParameter('outputField', 0) as string;

		try {
			let result: unknown;
			let tokenMetrics: IDataObject | undefined;

			switch (operation) {
				case 'jsonToToon': {
					// 将所有 items 的 json 数据收集成一个数组
					const allData = items.map(item => item.json);
					const conversionResult = convertJsonToToon(this, allData);
					result = conversionResult.toon;
					tokenMetrics = conversionResult.tokenMetrics;
					break;
				}
				case 'toonToJson': {
					const toonInput = this.getNodeParameter('toonInput', 0) as string;
					result = convertToonToJson(this, toonInput);
					break;
				}
				default:
					throw new NodeOperationError(
						this.getNode(),
						`未知操作: ${operation}`,
					);
			}

			// 构建输出
			const outputJson = {
				[outputField]: result,
			} as IDataObject;

			// 如果有 token 统计则添加
			if (tokenMetrics) {
				outputJson.tokenMetrics = tokenMetrics;
			}

			// 返回单个输出项
			return [[{ json: outputJson }]];
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{
					json: {
						error: (error as Error).message,
					},
				}]];
			}
			throw new NodeOperationError(this.getNode(), error as Error);
		}
	}
}
