# Backend unit tests

    npm i -D vitest @vitest/coverage-v8 supertest @types/supertest
    npm test               # vitest run
    npm run test:coverage

Add to package.json scripts: "test": "vitest run", "test:watch": "vitest", "test:coverage": "vitest run --coverage"

No real database, SMTP, Twilio, OpenAI or PayFast is contacted: everything external is mocked.

    unit-tests/
      setup/        env vars, temp cwd, express req/res helpers
      lib/ validation/ middleware/ utils/ config/   pure logic (zod schemas, JWT auth, PayFast signatures, cost maths, mails, SMS, files, db, multer)
      models/       schema-driven tests for EVERY model (required/enum/default/unique) + hooks, methods, statics
      controllers/  every exported handler: responds once, maps service errors to HTTP codes
      services/     user service, PayFast service, import smoke for all services
      routes/       route table, auth coverage per route, 401 behaviour via supertest
      app.test.ts   CORS, mounting, error handler

`it.fails(...)` = a REAL bug in src that the test describes. The suite stays green while the bug exists
and turns RED once you fix it - then change `it.fails` to `it`.
