import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class Markdown implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Markdown',
		name: 'hollycrm_markdown',
		icon: 'file:markdown.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Markdown 文本',
		description: '输入和处理 Markdown 多行文本',
		defaults: {
			name: 'Markdown',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Markdown 内容',
				name: 'markdownContent',
				type: 'string',
				typeOptions: {
					rows: 15,
				},
				default: '',
				required: true,
				placeholder: '在此输入 Markdown 文本...\n\n# 标题\n\n- 列表项 1\n- 列表项 2\n\n**粗体** 和 *斜体*',
				description: '输入多行 Markdown 格式的文本内容',
			},
			{
				displayName: '输出字段名',
				name: 'outputFieldName',
				type: 'string',
				default: 'markdown',
				description: '输出 JSON 中存储 Markdown 内容的字段名',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '去除首尾空白',
						name: 'trim',
						type: 'boolean',
						default: true,
						description: '是否去除 Markdown 内容的首尾空白字符',
					},
					{
						displayName: '保留输入数据',
						name: 'keepInputData',
						type: 'boolean',
						default: false,
						description: '是否将输入数据的字段合并到输出中',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				let markdownContent = this.getNodeParameter('markdownContent', i) as string;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				const options = this.getNodeParameter('options', i) as {
					trim?: boolean;
					keepInputData?: boolean;
				};

				// 处理去除空白
				if (options.trim !== false) {
					markdownContent = markdownContent.trim();
				}

				// 构建输出数据
				let outputJson: IDataObject = {};

				// 如果保留输入数据，先复制输入
				if (options.keepInputData) {
					outputJson = { ...items[i].json };
				}

				// 添加 Markdown 内容
				outputJson[outputFieldName] = markdownContent;

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(outputJson),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
