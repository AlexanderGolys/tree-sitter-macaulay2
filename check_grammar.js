try {
  const grammar = require('./grammar.js');
  console.log('Grammar loaded successfully');
  console.log('Name:', grammar.name);
} catch (e) {
  console.error('Error loading grammar:', e);
}
