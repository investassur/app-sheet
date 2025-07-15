module.exports = {
  plugins: [
    'postcss-import',
    'tailwindcss/nesting',
    'tailwindcss',
    ['postcss-preset-env', {
      stage: 1,
      features: {
        'nesting-rules': true,
      },
    }],
    'autoprefixer',
  ],
}
