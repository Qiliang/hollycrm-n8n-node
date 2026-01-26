module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json',
		sourceType: 'module',
	},
	ignorePatterns: ['.eslintrc.js', 'gulpfile.js', 'dist/**/*'],
	rules: {},
};
