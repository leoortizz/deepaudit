// Synthetic conformance issues for e2e testing. The "vulnerable-app"
// fixture name is historical — post-fork this file gives the
// conformance matchers something to chew on so the e2e scan pipeline
// has a stable target.

// console-log violations
console.log("startup");
console.error("oops");
console.warn("legacy");

// any-type violations
function takeAnything(x: any) {
  return x;
}
const payload: any = { foo: 1 };

// process-env-direct violations
const dbUrl = process.env.DATABASE_URL;
const port = process.env.PORT;

// todo-no-link violations
// TODO: refactor this once we drop Node 18
// FIXME handle the empty array case

// non-null-assertion violations
function head<T>(arr: T[]): T {
  return arr[0]!;
}

// default-export
export default takeAnything;
