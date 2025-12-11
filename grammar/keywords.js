const { keyword_constants } = require('./literal');
const 
    operators = require('./operators');

module.exports = {

    ...operators,

    keyword : $ => choice(
        operator
    ),

}
