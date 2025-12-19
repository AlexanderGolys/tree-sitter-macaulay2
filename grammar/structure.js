
module.exports = {

    _interline_comment_start: $ => token('-*'),
    _interline_comment_end: $ => token('*-'),
    _full_line_comment_start : $ => token('--'),
    _comment_delimiter : $ => choice(
        $._interline_comment_start,
        $._interline_comment_end,
        $._full_line_comment_start
    ),

    _newline : $ => token('\n'),
    _EOF : $ => token('\0'),
    _end_of_line_token: $ => repeat1(choice($._newline, $._EOF)),

    interline_comment : $ => seq(
        $._interline_comment_start,
        repeat(choice(
            /[^*\-\n]+/,
            /\*+[^-]/,
            /-+[^*]/,
            $._newline
        )),
        $._interline_comment_end
    ),

    full_line_comment : $ => seq(
        $._full_line_comment_start,
        repeat(/[^\n]/),
        $._end_of_line_token
    ),

    comment : $ => choice(
        $.interline_comment,
        $.full_line_comment
    ),

    end_of_line : $ => repeat1(choice(
        $.full_line_comment,
        $._end_of_line_token
    )),

    _ws : $ => repeat1(choice(
        token(' '),
        token('\t')
    )),

    null_component: $ => blank(),



}
