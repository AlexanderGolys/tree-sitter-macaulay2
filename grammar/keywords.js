// Macaulay2 Keywords organized by precedence and category
// Reference: M2 precedence table
// Notes:
// - Control flow keywords act as unary operators with bracket-like structure
// - The "last" keyword in a control statement determines binding
// - break/continue are context-dependent (valid only in loops)

module.exports = {

    // ==================== PRECEDENCE 12 ====================
    // These keywords bind their following expression at precedence 12
    // do, else, list, then
    do_keyword: $ => token('do'),
    else_keyword: $ => token('else'),
    list_keyword: $ => token('list'),
    then_keyword: $ => token('then'),

    // ==================== PRECEDENCE 16 ====================
    // for-loop clause keywords (unary 16)
    from_keyword: $ => token('from'),
    in_keyword: $ => token('in'),
    of_keyword: $ => token('of'),
    to_keyword: $ => token('to'),
    when_keyword: $ => token('when'),

    // ==================== PRECEDENCE 62 (unary 12) ====================
    // Control flow starters
    if_keyword: $ => token('if'),
    while_keyword: $ => token('while'),
    try_keyword: $ => token('try'),
    catch_keyword: $ => token('catch'),

    // Loop control (context-dependent - only valid inside loops)
    break_keyword: $ => token('break'),
    continue_keyword: $ => token('continue'),
    return_keyword: $ => token('return'),
    throw_keyword: $ => token('throw'),

    // ==================== PRECEDENCE 62 (unary 16) ====================
    // for, new
    for_keyword: $ => token('for'),
    new_keyword: $ => token('new'),

    // ==================== PRECEDENCE 62 (unary 74) ====================
    // Variable declaration keywords - highest unary binding
    global_keyword: $ => token('global'),
    local_keyword: $ => token('local'),
    symbol_keyword: $ => token('symbol'),
    threadlocal_keyword: $ => token('threadLocal'),

    // ==================== TIMING/PROFILING ====================
    // These are also unary 12
    time_keyword: $ => token('time'),
    timing_keyword: $ => token('timing'),
    elapsedTime_keyword: $ => token('elapsedTime'),
    elapsedTiming_keyword: $ => token('elapsedTiming'),
    profile_keyword: $ => token('profile'),
    step_keyword: $ => token('step'),
    shield_keyword: $ => token('shield'),

    // ==================== TESTING ====================
    test_keyword: $ => token('TEST'),
    breakpoint_keyword: $ => token('breakpoint'),

}
