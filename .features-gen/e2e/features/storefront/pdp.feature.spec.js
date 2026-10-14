// Generated from: e2e/features/storefront/pdp.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Storefront product detail page', () => {

  test('E2E Product detail page shows title and add-to-cart button', async ({ Given, Then, And, page }) => { 
    await Given('I am on the E2E Product detail page', null, { page }); 
    await Then('the page heading contains "E2E Product"', null, { page }); 
    await And('I see an add-to-cart button', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/storefront/pdp.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I am on the E2E Product detail page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then the page heading contains \"E2E Product\"","stepMatchArguments":[{"group":{"start":26,"value":"\"E2E Product\"","children":[{"start":27,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"And I see an add-to-cart button","stepMatchArguments":[]}]},
]; // bdd-data-end