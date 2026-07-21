// pino-compatible stub that uses console for serverless environments.
  // Avoids pino's worker-thread / sonic-boom / native-module path that can
  // crash Vercel's Node.js 22 serverless runtime.
  function makeLogger(opts) {
    const levelNames = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
    const currentLevel = levelNames[opts?.level ?? "info"] ?? 30;
    function emit(levelNum, levelStr, args) {
      if (levelNum < currentLevel) return;
      let msg = "";
      let ctx = {};
      if (typeof args[0] === "string") {
        msg = args[0];
      } else if (typeof args[0] === "object" && args[0] !== null) {
        ctx = args[0];
        msg = typeof args[1] === "string" ? args[1] : "";
      }
      const record = JSON.stringify({ level: levelNum, time: Date.now(), ...ctx, msg });
      if (levelNum >= 50) console.error(record);
      else if (levelNum >= 40) console.warn(record);
      else console.log(record);
    }
    const logger = {
      level: opts?.level ?? "info",
      trace:  (...a) => emit(10, "trace",  a),
      debug:  (...a) => emit(20, "debug",  a),
      info:   (...a) => emit(30, "info",   a),
      warn:   (...a) => emit(40, "warn",   a),
      error:  (...a) => emit(50, "error",  a),
      fatal:  (...a) => emit(60, "fatal",  a),
      child:  (bindings) => makeLogger({ ...(opts ?? {}), ...bindings }),
      silent: () => {},
    };
    return logger;
  }
  export default makeLogger;
  