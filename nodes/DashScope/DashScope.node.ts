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
		// 动态输入端点：主输入 + 上下文输入
		inputs: `={{
			(() => {
				const contextCount = $parameter.contextCount || 0;
				const inputs = [{ type: 'main', displayName: '主输入' }];
				const contextNames = [
					$parameter.context1Name || '上下文 1',
					$parameter.context2Name || '上下文 2',
					$parameter.context3Name || '上下文 3',
					$parameter.context4Name || '上下文 4',
					$parameter.context5Name || '上下文 5',
				];
				for (let i = 0; i < contextCount; i++) {
					inputs.push({ type: 'main', displayName: contextNames[i] });
				}
				return inputs;
			})()
		}}`,
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
				displayName: '上下文数量',
				name: 'contextCount',
				type: 'options',
				options: [
					{ name: '0', value: 0 },
					{ name: '1', value: 1 },
					{ name: '2', value: 2 },
					{ name: '3', value: 3 },
					{ name: '4', value: 4 },
					{ name: '5', value: 5 },
				],
				default: 0,
				description: '添加额外的上下文输入端点数量',
			},
			// 上下文 1 配置
			{
				displayName: '上下文 1 名称',
				name: 'context1Name',
				type: 'string',
				default: '上下文 1',
				placeholder: '例如：用户历史',
				description: '上下文 1 的名称，将显示在输入端点上',
				displayOptions: { show: { contextCount: [1, 2, 3, 4, 5] } },
			},
			{
				displayName: '上下文 1 数据字段',
				name: 'context1DataField',
				type: 'string',
				default: '',
				placeholder: '留空则使用整个 JSON',
				description: '从上下文 1 输入中提取的 JSON 字段名',
				displayOptions: { show: { contextCount: [1, 2, 3, 4, 5] } },
			},
			// 上下文 2 配置
			{
				displayName: '上下文 2 名称',
				name: 'context2Name',
				type: 'string',
				default: '上下文 2',
				placeholder: '例如：产品信息',
				description: '上下文 2 的名称，将显示在输入端点上',
				displayOptions: { show: { contextCount: [2, 3, 4, 5] } },
			},
			{
				displayName: '上下文 2 数据字段',
				name: 'context2DataField',
				type: 'string',
				default: '',
				placeholder: '留空则使用整个 JSON',
				description: '从上下文 2 输入中提取的 JSON 字段名',
				displayOptions: { show: { contextCount: [2, 3, 4, 5] } },
			},
			// 上下文 3 配置
			{
				displayName: '上下文 3 名称',
				name: 'context3Name',
				type: 'string',
				default: '上下文 3',
				placeholder: '例如：订单记录',
				description: '上下文 3 的名称，将显示在输入端点上',
				displayOptions: { show: { contextCount: [3, 4, 5] } },
			},
			{
				displayName: '上下文 3 数据字段',
				name: 'context3DataField',
				type: 'string',
				default: '',
				placeholder: '留空则使用整个 JSON',
				description: '从上下文 3 输入中提取的 JSON 字段名',
				displayOptions: { show: { contextCount: [3, 4, 5] } },
			},
			// 上下文 4 配置
			{
				displayName: '上下文 4 名称',
				name: 'context4Name',
				type: 'string',
				default: '上下文 4',
				placeholder: '例如：知识库',
				description: '上下文 4 的名称，将显示在输入端点上',
				displayOptions: { show: { contextCount: [4, 5] } },
			},
			{
				displayName: '上下文 4 数据字段',
				name: 'context4DataField',
				type: 'string',
				default: '',
				placeholder: '留空则使用整个 JSON',
				description: '从上下文 4 输入中提取的 JSON 字段名',
				displayOptions: { show: { contextCount: [4, 5] } },
			},
			// 上下文 5 配置
			{
				displayName: '上下文 5 名称',
				name: 'context5Name',
				type: 'string',
				default: '上下文 5',
				placeholder: '例如：系统配置',
				description: '上下文 5 的名称，将显示在输入端点上',
				displayOptions: { show: { contextCount: [5] } },
			},
			{
				displayName: '上下文 5 数据字段',
				name: 'context5DataField',
				type: 'string',
				default: '',
				placeholder: '留空则使用整个 JSON',
				description: '从上下文 5 输入中提取的 JSON 字段名',
				displayOptions: { show: { contextCount: [5] } },
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
					{
						displayName: 'JSON 格式输出',
						name: 'jsonFormat',
						type: 'boolean',
						default: false,
						description: '是否强制模型返回 JSON 格式的响应',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(0); // 主输入
		const returnData: INodeExecutionData[] = [];

		// 获取上下文数量
		const contextCount = this.getNodeParameter('contextCount', 0) as number;

		// 获取上下文配置
		const contextConfigs = [
			{
				name: this.getNodeParameter('context1Name', 0, '上下文 1') as string,
				dataField: this.getNodeParameter('context1DataField', 0, '') as string,
			},
			{
				name: this.getNodeParameter('context2Name', 0, '上下文 2') as string,
				dataField: this.getNodeParameter('context2DataField', 0, '') as string,
			},
			{
				name: this.getNodeParameter('context3Name', 0, '上下文 3') as string,
				dataField: this.getNodeParameter('context3DataField', 0, '') as string,
			},
			{
				name: this.getNodeParameter('context4Name', 0, '上下文 4') as string,
				dataField: this.getNodeParameter('context4DataField', 0, '') as string,
			},
			{
				name: this.getNodeParameter('context5Name', 0, '上下文 5') as string,
				dataField: this.getNodeParameter('context5DataField', 0, '') as string,
			},
		];

		// 收集所有上下文数据
		const contextDataList: Array<{ name: string; data: unknown }> = [];
		for (let ctxIndex = 0; ctxIndex < contextCount; ctxIndex++) {
			const inputIndex = ctxIndex + 1; // 上下文输入从索引1开始
			const contextItems = this.getInputData(inputIndex);
			const config = contextConfigs[ctxIndex];
			const contextName = config.name;
			const dataField = config.dataField;

			// 提取上下文数据
			const contextData: unknown[] = [];
			for (const item of contextItems) {
				if (item.json) {
					// 如果指定了字段，尝试提取该字段；否则使用整个 json
					const value = dataField && item.json[dataField] !== undefined
						? item.json[dataField]
						: item.json;
					contextData.push(value);
				}
			}

			contextDataList.push({
				name: contextName,
				data: contextData.length === 1 ? contextData[0] : contextData,
			});
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const model = this.getNodeParameter('model', i) as string;
				const systemPrompt = this.getNodeParameter('systemPrompt', i) as string;
				const userMessage = this.getNodeParameter('userMessage', i) as string;
				const options = this.getNodeParameter('options', i) as {
					temperature?: number;
					maxTokens?: number;
					topP?: number;
					jsonFormat?: boolean;
				};

				// 构建包含上下文的用户消息
				let fullUserMessage = userMessage;
				if (contextDataList.length > 0) {
					const contextSection = contextDataList
						.map(ctx => `【${ctx.name}】:\n${typeof ctx.data === 'string' ? ctx.data : JSON.stringify(ctx.data, null, 2)}`)
						.join('\n\n');
					fullUserMessage = `${contextSection}\n\n【用户消息】:\n${userMessage}`;
				}

				const body: Record<string, unknown> = {
					model,
					messages: [
						{
							role: 'system',
							content: systemPrompt,
						},
						{
							role: 'user',
							content: fullUserMessage,
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
				if (options.jsonFormat === true) {
					body.response_format = { type: 'json_object' };
				}

				console.log('body', body);

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
						contexts: contextDataList,
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
