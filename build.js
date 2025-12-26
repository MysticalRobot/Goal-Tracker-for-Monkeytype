try {
  const outdir = './dist';
  await Bun.build({
    entrypoints: ['./background-script.ts'],
    outdir,
    format: 'esm'
  })
  await Bun.build({
    entrypoints: ['./popup/index.html'],
    outdir
  })
  await Bun.build({
    entrypoints: [
      './content-scripts/update-theme.ts',
      './content-scripts/count-typing.ts',
    ],
    outdir,
    format: 'iife',
  })
} catch (error) {
  console.error(error);
}
