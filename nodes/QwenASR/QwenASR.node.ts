import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class QwenASR implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qwen ASR',
		name: 'qwenAsr',
		icon: 'file:qwenasr.svg',
		group: ['transform'],
		version: 1,
		subtitle: '语音转文本',
		description: '使用阿里云 DashScope Qwen ASR 进行语音识别',
		defaults: {
			name: 'Qwen ASR',
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
				displayName: '音频来源',
				name: 'audioSource',
				type: 'options',
				options: [
					{
						name: '二进制数据',
						value: 'binaryData',
						description: '从上游节点获取音频二进制数据',
					},
					{
						name: 'URL',
						value: 'url',
						description: '从 URL 获取音频文件',
					},
				],
				default: 'binaryData',
				description: '选择音频文件的来源',
			},
			{
				displayName: '二进制属性名',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						audioSource: ['binaryData'],
					},
				},
				description: '包含音频数据的二进制属性名称',
			},
			{
				displayName: '音频 URL',
				name: 'audioUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						audioSource: ['url'],
					},
				},
				description: '音频文件的 URL 地址',
			},
			{
				displayName: '模型',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Qwen3 ASR Flash',
						value: 'qwen3-asr-flash',
					},
					{
						name: 'Qwen3 ASR Flash (新加坡)',
						value: 'qwen3-asr-flash-intl',
					},
					{
						name: 'Qwen3 ASR Flash (美国)',
						value: 'qwen3-asr-flash-us',
					},
				],
				default: 'qwen3-asr-flash',
				description: '选择要使用的 ASR 模型',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '语种',
						name: 'language',
						type: 'options',
						options: [
							{ name: '自动检测', value: '' },
							{ name: '中文', value: 'zh' },
							{ name: '英文', value: 'en' },
							{ name: '日语', value: 'ja' },
							{ name: '韩语', value: 'ko' },
							{ name: '粤语', value: 'yue' },
						],
						default: '',
						description: '指定音频的语种，以提升识别准确率',
					},
					{
						displayName: '启用逆文本标准化 (ITN)',
						name: 'enableItn',
						type: 'boolean',
						default: false,
						description: '是否启用逆文本标准化，将口语形式转为书面形式（如"一百二十三"转为"123"）',
					},
					{
						displayName: '系统提示词',
						name: 'systemPrompt',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						description: '可选的系统提示词，用于定制化识别的 Context',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const audioSource = this.getNodeParameter('audioSource', i) as string;
			const model = this.getNodeParameter('model', i) as string;
			const options = this.getNodeParameter('options', i) as {
				language?: string;
				enableItn?: boolean;
				systemPrompt?: string;
			};

			let audioDataUri: string;

			if (audioSource === 'binaryData') {
				// 从二进制数据获取音频
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

				// 获取 MIME 类型
				const mimeType = binaryData.mimeType || 'audio/mpeg';

				// 始终使用 getBinaryDataBuffer 获取数据，这是最可靠的方式
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				const base64Data = buffer.toString('base64');

				if (!base64Data) {
					throw new NodeOperationError(
						this.getNode(),
						'无法获取音频二进制数据，数据为空',
						{ itemIndex: i },
					);
				}

				audioDataUri = `data:${mimeType};base64,${base64Data}`;
			} else {
				// 从 URL 获取音频
				const audioUrl = this.getNodeParameter('audioUrl', i) as string;
				if (!audioUrl) {
					throw new NodeOperationError(
						this.getNode(),
						'请提供音频 URL',
						{ itemIndex: i },
					);
				}

				// 下载音频并转换为 base64
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: audioUrl,
					encoding: 'arraybuffer',
				});

				const buffer = Buffer.from(response as ArrayBuffer);
				const base64Data = buffer.toString('base64');

				// 从 URL 推断 MIME 类型
				let mimeType = 'audio/mpeg';
				const urlLower = audioUrl.toLowerCase();
				if (urlLower.includes('.wav')) {
					mimeType = 'audio/wav';
				} else if (urlLower.includes('.mp3')) {
					mimeType = 'audio/mpeg';
				} else if (urlLower.includes('.ogg')) {
					mimeType = 'audio/ogg';
				} else if (urlLower.includes('.flac')) {
					mimeType = 'audio/flac';
				} else if (urlLower.includes('.m4a')) {
					mimeType = 'audio/mp4';
				}

				audioDataUri = `data:${mimeType};base64,${base64Data}`;
			}

			// 构建请求体
			const messages = [
				{
					role: 'system',
					content: [{ text: options.systemPrompt || '' }],
				},
				{
					role: 'user',
					content: [{ audio: audioDataUri }],
				},
			];

			// 构建 ASR 选项
			const asrOptions: Record<string, unknown> = {};
			if (options.language) {
				asrOptions.language = options.language;
			}
			asrOptions.enable_itn = options.enableItn ?? false;

			// 确定 API 端点
			let baseUrl = 'https://dashscope.aliyuncs.com';
			let actualModel = model;
			if (model === 'qwen3-asr-flash-intl') {
				baseUrl = 'https://dashscope-intl.aliyuncs.com';
				actualModel = 'qwen3-asr-flash';
			} else if (model === 'qwen3-asr-flash-us') {
				baseUrl = 'https://dashscope-us.aliyuncs.com';
				actualModel = 'qwen3-asr-flash';
			}

			const requestBody = {
				model: actualModel,
				input: {
					messages,
				},
				parameters: {
					result_format: 'message',
					asr_options: asrOptions,
				},
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'dashScopeApi',
				{
					method: 'POST',
					url: `${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`,
					body: requestBody,
					json: true,
				},
			);

			// 解析响应
			const outputContent = response?.output?.choices?.[0]?.message?.content;
			let transcribedText = '';

			if (Array.isArray(outputContent)) {
				// 从 content 数组中提取文本
				for (const item of outputContent) {
					if (item.text) {
						transcribedText += item.text;
					}
				}
			} else if (typeof outputContent === 'string') {
				transcribedText = outputContent;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({
					text: transcribedText,
					model: response?.model,
					usage: response?.usage,
					fullResponse: response,
				}),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);

		}

		return [returnData];
	}
}
