import assert from "node:assert/strict";
import {
  authFlowActive,
  authFlowNeedsGstPanel,
  completeGstVerification,
  createAuthFlow,
  detectAuthIntent,
  processAuthMessage,
  startAuthFlow,
} from "../src/lib/ai-auth/flow";

function run() {
  assert.equal(detectAuthIntent("I want to register"), "register");
  assert.equal(detectAuthIntent("login please"), "login");
  assert.equal(detectAuthIntent("cancel"), "cancel");

  let flow = createAuthFlow("register");
  assert.ok(authFlowActive(flow));

  const started = startAuthFlow("register", "en");
  assert.match(started.reply, /company/i);

  let step = processAuthMessage(started.state, "Acme Textiles", "en");
  assert.match(step.reply, /GST/i);
  assert.equal(step.state.fieldIndex, 1);

  step = processAuthMessage(step.state, "24AABCU9603R1ZM", "en");
  assert.equal(step.readyForGstVerify, true);
  assert.equal(step.state.phase, "gst_verify");
  assert.ok(authFlowNeedsGstPanel(step.state));

  const verified = completeGstVerification(
    step.state,
    {
      gst: "24AABCU9603R1ZM",
      tradeName: "Acme Textiles Pvt Ltd",
      legalName: "Acme Textiles",
    },
    "en",
  );
  assert.match(verified.reply, /contact person/i);
  assert.equal(verified.state.gstVerified, true);
  assert.equal(verified.state.fieldIndex, 2);

  const skipFlow = processAuthMessage(started.state, "Acme Textiles", "en");
  step = processAuthMessage(skipFlow.state, "skip", "en");
  assert.match(step.reply, /contact person/i);
  assert.notEqual(step.state.phase, "gst_verify");

  step = processAuthMessage(verified.state, "Rahul Sharma", "en");
  assert.match(step.reply, /mobile/i);

  step = processAuthMessage(step.state, "9876543210", "en");
  assert.match(step.reply, /email/i);

  step = processAuthMessage(step.state, "rahul@acme.in", "en");
  assert.match(step.reply, /city/i);

  step = processAuthMessage(step.state, "Surat", "en");
  assert.match(step.reply, /state/i);

  step = processAuthMessage(step.state, "Gujarat", "en");
  assert.equal(step.readyForOtp, true);
  assert.equal(step.otpEmail, "rahul@acme.in");
  assert.equal(step.state.phase, "otp");

  const loginStart = startAuthFlow("login", "en");
  assert.match(loginStart.reply, /email/i);
  const loginStep = processAuthMessage(loginStart.state, "rahul@acme.in", "en");
  assert.equal(loginStep.readyForOtp, true);
  assert.equal(loginStep.otpEmail, "rahul@acme.in");

  const cancelled = processAuthMessage(started.state, "cancel", "en");
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.state.phase, "done");
  assert.ok(!authFlowActive(cancelled.state));

  console.log("test-ai-auth-flow: ok");
}

run();
