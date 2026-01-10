parse = f -> try (replace("fetch 1 0", "fetch e", (replace("fetch 0 0", "fetch x", (separate(": (([0-9]+)|false) ", disassemble f))#4)))) 

