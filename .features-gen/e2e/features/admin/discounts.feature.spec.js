// Generated from: e2e/features/admin/discounts.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Admin discounts management', () => {

  test('Discounts list renders without error', { tag: ['@admin'] }, async ({ Given, Then, page }) => { 
    await Given('I am on the admin discounts page', null, { page }); 
    await Then('the discounts page loads successfully', null, { page }); 
  });

  test('Admin creates a discount', { tag: ['@admin'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the new discount page', null, { page }); 
    await When('I enter the discount code "E2ETEST10"', null, { page }); 
    await And('I select the discount type "percentage"', null, { page }); 
    await And('I set the discount value to "10"', null, { page }); 
    await And('I submit the discount form', null, { page }); 
    await Then('I see the discount code "E2ETEST10" in the discounts list', null, { page }); 
  });

  test('Admin deletes a discount', { tag: ['@admin'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the admin discounts page', null, { page }); 
    await When('I delete the discount "E2ETEST10"', null, { page }); 
    await Then('the discount "E2ETEST10" is not in the discounts list', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/admin/discounts.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@admin"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am on the admin discounts page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then the discounts page loads successfully","stepMatchArguments":[]}]},
  {"pwTestLine":11,"pickleLine":8,"tags":["@admin"],"steps":[{"pwStepLine":12,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given I am on the new discount page","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I enter the discount code \"E2ETEST10\"","stepMatchArguments":[{"group":{"start":26,"value":"\"E2ETEST10\"","children":[{"start":27,"value":"E2ETEST10","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I select the discount type \"percentage\"","stepMatchArguments":[{"group":{"start":27,"value":"\"percentage\"","children":[{"start":28,"value":"percentage","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And I set the discount value to \"10\"","stepMatchArguments":[{"group":{"start":28,"value":"\"10\"","children":[{"start":29,"value":"10","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"And I submit the discount form","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then I see the discount code \"E2ETEST10\" in the discounts list","stepMatchArguments":[{"group":{"start":24,"value":"\"E2ETEST10\"","children":[{"start":25,"value":"E2ETEST10","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":20,"pickleLine":16,"tags":["@admin"],"steps":[{"pwStepLine":21,"gherkinStepLine":17,"keywordType":"Context","textWithKeyword":"Given I am on the admin discounts page","stepMatchArguments":[]},{"pwStepLine":22,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"When I delete the discount \"E2ETEST10\"","stepMatchArguments":[{"group":{"start":22,"value":"\"E2ETEST10\"","children":[{"start":23,"value":"E2ETEST10","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":23,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then the discount \"E2ETEST10\" is not in the discounts list","stepMatchArguments":[{"group":{"start":13,"value":"\"E2ETEST10\"","children":[{"start":14,"value":"E2ETEST10","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end