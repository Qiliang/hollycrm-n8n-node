import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DashScopeApi implements ICredentialType {
	name = 'dashScopeApi';
	displayName = 'DashScope API';
	documentationUrl = 'https://help.aliyun.com/document_detail/2712195.html';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: '阿里云 DashScope API Key',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://dashscope.aliyuncs.com',
			url: '/compatible-mode/v1/models',
			method: 'GET',
		},
	};
}
