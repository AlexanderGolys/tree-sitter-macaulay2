f=x->x; << "time f 1 + 2: " << disassemble functionBody(() -> time f 1 + 2) << endl
f=x->x; << "try f 1 then 2: " << disassemble functionBody(() -> try f 1 then 2) << endl
f=x->x; << "if f 1 then 2: " << disassemble functionBody(() -> if f 1 then 2) << endl
