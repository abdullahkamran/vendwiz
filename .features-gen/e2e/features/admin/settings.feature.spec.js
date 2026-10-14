// Generated from: e2e/features/admin/settings.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Admin settings', () => {

  test('Settings page renders store name field', { tag: ['@admin'] }, async ({ Given, Then, And, page }) => { 
    await Given('I am on the admin settings page', null, { page }); 
    await Then('I see an input for store name', null, { page }); 
    await And('the store name field has a non-empty value', null, { page }); 
  });

  test('Admin updates store name', { tag: ['@admin'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the admin settings page', null, { page }); 
    await When('I change the store name to "E2E Store Updated"', null, { page }); 
    await And('I save the store settings', null, { page }); 
    await Then('I see a success indication for the store name update', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/admin/settings.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@admin"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am on the admin settings page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then I see an input for store name","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"And the store name field has a non-empty value","stepMatchArguments":[]}]},
  {"pwTestLine":12,"pickleLine":9,"tags":["@admin"],"steps":[{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"Given I am on the admin settings page","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"When I change the store name to \"E2E Store Updated\"","stepMatchArguments":[{"group":{"start":27,"value":"\"E2E Store Updated\"","children":[{"start":28,"value":"E2E Store Updated","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And I save the store settings","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I see a success indication for the store name update","stepMatchArguments":[]}]},
]; // bdd-data-end