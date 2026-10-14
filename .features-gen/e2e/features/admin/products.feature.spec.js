// Generated from: e2e/features/admin/products.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Admin products management', () => {

  test('Products list shows seeded product', { tag: ['@admin'] }, async ({ Given, Then, page }) => { 
    await Given('I am on the admin products page', null, { page }); 
    await Then('I see "E2E Product" in the product list', null, { page }); 
  });

  test('Admin creates a product', { tag: ['@admin'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the new product page', null, { page }); 
    await When('I enter the product title "E2E Create Test"', null, { page }); 
    await And('I enter the product price "100"', null, { page }); 
    await And('I enter the product stock "10"', null, { page }); 
    await And('I submit the product form', null, { page }); 
    await Then('I am on the product edit page', null, { page }); 
    await When('I go to the admin products page', null, { page }); 
    await Then('I see "E2E Create Test" in the product list', null, { page }); 
  });

  test('Admin edits a product', { tag: ['@admin'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the admin products page', null, { page }); 
    await When('I click the edit link for the product titled "E2E Create Test"', null, { page }); 
    await And('I change the product title to "E2E Edited Product"', null, { page }); 
    await And('I submit the product form', null, { page }); 
    await Then('the page shows "E2E Edited Product"', null, { page }); 
  });

  test('Admin deletes a product', { tag: ['@admin'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the admin products page', null, { page }); 
    await When('I delete the product titled "E2E Edited Product"', null, { page }); 
    await Then('"E2E Edited Product" is not in the product list', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/admin/products.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@admin"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am on the admin products page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then I see \"E2E Product\" in the product list","stepMatchArguments":[{"group":{"start":6,"value":"\"E2E Product\"","children":[{"start":7,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":11,"pickleLine":8,"tags":["@admin"],"steps":[{"pwStepLine":12,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given I am on the new product page","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I enter the product title \"E2E Create Test\"","stepMatchArguments":[{"group":{"start":26,"value":"\"E2E Create Test\"","children":[{"start":27,"value":"E2E Create Test","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I enter the product price \"100\"","stepMatchArguments":[{"group":{"start":26,"value":"\"100\"","children":[{"start":27,"value":"100","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And I enter the product stock \"10\"","stepMatchArguments":[{"group":{"start":26,"value":"\"10\"","children":[{"start":27,"value":"10","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"And I submit the product form","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then I am on the product edit page","stepMatchArguments":[]},{"pwStepLine":18,"gherkinStepLine":15,"keywordType":"Action","textWithKeyword":"When I go to the admin products page","stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then I see \"E2E Create Test\" in the product list","stepMatchArguments":[{"group":{"start":6,"value":"\"E2E Create Test\"","children":[{"start":7,"value":"E2E Create Test","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":22,"pickleLine":18,"tags":["@admin"],"steps":[{"pwStepLine":23,"gherkinStepLine":19,"keywordType":"Context","textWithKeyword":"Given I am on the admin products page","stepMatchArguments":[]},{"pwStepLine":24,"gherkinStepLine":20,"keywordType":"Action","textWithKeyword":"When I click the edit link for the product titled \"E2E Create Test\"","stepMatchArguments":[{"group":{"start":45,"value":"\"E2E Create Test\"","children":[{"start":46,"value":"E2E Create Test","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":25,"gherkinStepLine":21,"keywordType":"Action","textWithKeyword":"And I change the product title to \"E2E Edited Product\"","stepMatchArguments":[{"group":{"start":30,"value":"\"E2E Edited Product\"","children":[{"start":31,"value":"E2E Edited Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":26,"gherkinStepLine":22,"keywordType":"Action","textWithKeyword":"And I submit the product form","stepMatchArguments":[]},{"pwStepLine":27,"gherkinStepLine":23,"keywordType":"Outcome","textWithKeyword":"Then the page shows \"E2E Edited Product\"","stepMatchArguments":[{"group":{"start":15,"value":"\"E2E Edited Product\"","children":[{"start":16,"value":"E2E Edited Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":30,"pickleLine":25,"tags":["@admin"],"steps":[{"pwStepLine":31,"gherkinStepLine":26,"keywordType":"Context","textWithKeyword":"Given I am on the admin products page","stepMatchArguments":[]},{"pwStepLine":32,"gherkinStepLine":27,"keywordType":"Action","textWithKeyword":"When I delete the product titled \"E2E Edited Product\"","stepMatchArguments":[{"group":{"start":28,"value":"\"E2E Edited Product\"","children":[{"start":29,"value":"E2E Edited Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":33,"gherkinStepLine":28,"keywordType":"Outcome","textWithKeyword":"Then \"E2E Edited Product\" is not in the product list","stepMatchArguments":[{"group":{"start":0,"value":"\"E2E Edited Product\"","children":[{"start":1,"value":"E2E Edited Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end