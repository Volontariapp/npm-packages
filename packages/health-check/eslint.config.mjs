import config from '@volontariapp/eslint-config';

export default [
	...config,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: false,
				tsconfigRootDir: import.meta.dirname,
				project: ['./tsconfig.json'],
			},
		},
	},
];
