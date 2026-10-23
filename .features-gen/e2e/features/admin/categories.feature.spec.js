// Generated from: e2e/features/admin/categories.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Admin categories management', () => {

  test('Categories list shows seeded category', { tag: ['@admin'] }, async ({ Given, Then, page }) => { 
    await Given('I am on the admin categories page', null, { page }); 
    await Then('I see "E2E Category" in the category list', null, { page }); 
  });

  test('Admin creates a category', { tag: ['@admin'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the admin categories page', null, { page }); 
    await When('I open the new category modal', null, { page }); 
    await And('I enter the category name "E2E New Cat"', null, { page }); 
    await And('I save the category', null, { page }); 
    await Then('I see "E2E New Cat" in the category list', null, { page }); 
  });

  test('Admin deletes a category', { tag: ['@admin'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the admin categories page', null, { page }); 
    await When('I delete the category named "E2E New Cat"', null, { page }); 
    await Then('"E2E New Cat" is not in the category list', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/admin/categories.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@admin"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am on the admin categories page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then I see \"E2E Category\" in the category list","stepMatchArguments":[{"group":{"start":6,"value":"\"E2E Category\"","children":[{"start":7,"value":"E2E Category","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":11,"pickleLine":8,"tags":["@admin"],"steps":[{"pwStepLine":12,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given I am on the admin categories page","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I open the new category modal","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I enter the category name \"E2E New Cat\"","stepMatchArguments":[{"group":{"start":26,"value":"\"E2E New Cat\"","children":[{"start":27,"value":"E2E New Cat","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And I save the category","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I see \"E2E New Cat\" in the category list","stepMatchArguments":[{"group":{"start":6,"value":"\"E2E New Cat\"","children":[{"start":7,"value":"E2E New Cat","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":19,"pickleLine":15,"tags":["@admin"],"steps":[{"pwStepLine":20,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"Given I am on the admin categories page","stepMatchArguments":[]},{"pwStepLine":21,"gherkinStepLine":17,"keywordType":"Action","textWithKeyword":"When I delete the category named \"E2E New Cat\"","stepMatchArguments":[{"group":{"start":28,"value":"\"E2E New Cat\"","children":[{"start":29,"value":"E2E New Cat","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"Then \"E2E New Cat\" is not in the category list","stepMatchArguments":[{"group":{"start":0,"value":"\"E2E New Cat\"","children":[{"start":1,"value":"E2E New Cat","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end