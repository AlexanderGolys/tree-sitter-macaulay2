
// Helper utilities for building grammar rules






const sloppy_component = (component, ws = $ => optional($._ws)) =>
    ($) => seq(ws($), component($), ws($));

const collection = (separator, component) =>
    ($) => seq(
        component($),
        repeat(seq(separator($), component($)))
    );

module.exports = {
    sloppy_component,
    collection,
};
