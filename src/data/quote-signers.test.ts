import assert from "node:assert/strict";
import {
  SIGNER_CHOICE_REQUIRED,
  SIGNER_NO_LONGER_AUTHORIZED,
  normalizeAuthorizedSigners,
  parseAuthorizedSignersInput,
  quoteSignerChoices,
  resolveSigningSigner,
  signerFromSession,
} from "./quote-signers.ts";

const quote = {
  customer_name: "Avery Client",
  customer_email: "Avery@Client.test",
  authorized_signers: [
    { name: "Blake Planner", title: "Planner", email: "Blake@Planner.test" },
    { name: "Avery Client", title: "Duplicate", email: "avery@client.test" },
    { name: "x", email: "bad" },
  ],
};

const choices = quoteSignerChoices(quote);
assert.deepEqual(
  choices.map((signer) => signer.email),
  ["avery@client.test", "blake@planner.test"]
);
assert.equal(choices[0].title, null);
assert.equal(choices[1].title, "Planner");

const ignored = resolveSigningSigner(
  { customer_name: "Avery Client", customer_email: "avery@client.test" },
  "stranger@example.com"
);
assert.equal(ignored.ok && ignored.locked, false);
assert.equal(ignored.ok && ignored.signer.email, "avery@client.test");

const chosen = resolveSigningSigner(quote, "BLAKE@planner.test");
assert.equal(chosen.ok && chosen.locked, true);
assert.equal(chosen.ok && chosen.signer.name, "Blake Planner");

const missing = resolveSigningSigner(quote, "nobody@example.com");
assert.equal(missing.ok, false);
assert.equal(!missing.ok && missing.message, SIGNER_CHOICE_REQUIRED);

const removed = signerFromSession(quote, "former@example.com");
assert.equal(removed.ok, false);
assert.equal(!removed.ok && removed.message, SIGNER_NO_LONGER_AUTHORIZED);

const saved = parseAuthorizedSignersInput(
  [
    { name: "", title: "", email: "" },
    { name: "Casey Buyer", title: "Director", email: "Casey@Buyer.test" },
  ],
  "avery@client.test"
);
assert.equal(saved.ok, true);
assert.deepEqual(saved.ok && saved.signers, [
  { name: "Casey Buyer", title: "Director", email: "casey@buyer.test" },
]);

const collision = parseAuthorizedSignersInput(
  [{ name: "Avery Client", email: "avery@client.test" }],
  "avery@client.test"
);
assert.equal(collision.ok, false);

assert.equal(normalizeAuthorizedSigners("nope").length, 0);

console.log("quote signer checks passed");
