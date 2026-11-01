import assert from "node:assert/strict";
import test from "node:test";
import { validateProjectCreate, validateProjectUpdate } from "./project-validation";
test("project create trims names and applies defaults", () => {
 assert.deepEqual(validateProjectCreate({name:" Luna "}), {value:{name:"Luna",description:null,status:"active",metadata:{}}});
});
test("project create rejects malformed and invalid fields", () => {
 for (const v of [null, [], "name", {}]) assert.ok(validateProjectCreate(v).error);
 for (const v of [{name:" "},{name:"x".repeat(121)},{name:"ok",status:"unknown"},{name:"ok",metadata:[]},{name:"ok",description:42}]) assert.ok(validateProjectCreate(v).error);
});
test("project update allows only supported validated fields", () => {
 assert.deepEqual(validateProjectUpdate({name:" Updated ",status:"paused"}),{value:{name:"Updated",status:"paused"}});
 for (const v of [{},{user_id:"other"},{status:"unknown"},{name:" "},{metadata:null}]) assert.ok(validateProjectUpdate(v).error);
});