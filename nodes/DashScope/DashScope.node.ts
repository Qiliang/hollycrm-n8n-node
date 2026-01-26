import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class DashScope implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DashScope',
		name: 'dashScope',
		icon: 'file:dashscope.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: '调用阿里云 DashScope (通义千问) API',
		defaults: {
			name: 'DashScope',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dashScopeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '聊天补全',
						value: 'chatCompletion',
						description: '发送消息并获取 AI 响应',
						action: '发送聊天补全请求',
					},
				],
				default: 'chatCompletion',
			},
			{
				displayName: '模型',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Qwen Plus',
						value: 'qwen-plus',
					},
					{
						name: 'Qwen Turbo',
						value: 'qwen-turbo',
					},
					{
						name: 'Qwen Max',
						value: 'qwen-max',
					},
					{
						name: 'Qwen Long',
						value: 'qwen-long',
					},
				],
				default: 'qwen-plus',
				description: '选择要使用的模型',
			},
			{
				displayName: '系统提示词',
				name: 'systemPrompt',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: 'You are a helpful assistant.',
				description: '设置 AI 的角色和行为',
			},
			{
				displayName: '用户消息',
				name: 'userMessage',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				required: true,
				description: '发送给 AI 的用户消息',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '温度',
						name: 'temperature',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 1,
						},
						default: 1,
						description: '控制输出的随机性，值越高越随机',
					},
					{
						displayName: '最大 Token 数',
						name: 'maxTokens',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 8192,
						},
						default: 2048,
						description: '生成的最大 token 数量',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0.8,
						description: '核采样参数',
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
				const model = this.getNodeParameter('model', i) as string;
				const systemPrompt = this.getNodeParameter('systemPrompt', i) as string;
				const userMessage = this.getNodeParameter('userMessage', i) as string;
				const options = this.getNodeParameter('options', i) as {
					temperature?: number;
					maxTokens?: number;
					topP?: number;
				};

				const body: Record<string, unknown> = {
					model,
					messages: [
						{
							role: 'system',
							content: systemPrompt,
						},
						{
							role: 'user',
							content: userMessage,
						},
					],
				};

				if (options.temperature !== undefined) {
					body.temperature = options.temperature;
				}
				if (options.maxTokens !== undefined) {
					body.max_tokens = options.maxTokens;
				}
				if (options.topP !== undefined) {
					body.top_p = options.topP;
				}

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'dashScopeApi',
					{
						method: 'POST',
						url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
						body,
						json: true,
					},
				);

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({
						response: response.choices?.[0]?.message?.content ?? '',
						model: response.model,
						usage: response.usage,
						fullResponse: response,
					}),
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
