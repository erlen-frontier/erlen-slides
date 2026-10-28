// Render a cargo-about JSON report without machine-specific package metadata.
// Usage: node herramientas/licencias-rust.mjs < cargo-about.json > licenses/rust-dependencies.txt
let input = '';
for await (const chunk of process.stdin) input += chunk;
const report = JSON.parse(input);
const sections = report.licenses.map(license => {
  const crates = [...new Set(license.used_by.map(({crate}) => `${crate.name} ${crate.version}`))].sort();
  return [
    '='.repeat(72),
    `${license.name} (${license.id})`,
    `Packages: ${crates.join(', ')}`,
    '',
    // Normalize line endings and trailing whitespace without changing notice text.
    license.text.trim().replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, ''),
    '',
  ].join('\n');
});
process.stdout.write('Rust dependency license texts for the Linux desktop build.\n' +
  'Generated from Cargo.lock with cargo-about; see THIRD_PARTY_NOTICES.md.\n\n' + sections.join('\n'));
