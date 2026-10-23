// Generated from: e2e/features/storefront/cart.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Storefront cart', () => {

  test('Customer adds product to cart and sees it in cart page', async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the E2E Product detail page', null, { page }); 
    await When('I click the add to cart button', null, { page }); 
    await And('I navigate to the cart page', null, { page }); 
    await Then('I see "E2E Product" in the cart', null, { page }); 
  });

  test('Customer removes item shows empty cart', async ({ Given, When, Then, And, page }) => { 
    await Given('I have "E2E Product" in my cart', null, { page }); 
    await When('I navigate to the cart page', null, { page }); 
    await And('I remove "E2E Product" from the cart', null, { page }); 
    await Then('I see the empty cart message', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/storefront/cart.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I am on the E2E Product detail page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I click the add to cart button","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"And I navigate to the cart page","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I see \"E2E Product\" in the cart","stepMatchArguments":[{"group":{"start":6,"value":"\"E2E Product\"","children":[{"start":7,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":13,"pickleLine":9,"tags":[],"steps":[{"pwStepLine":14,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"Given I have \"E2E Product\" in my cart","stepMatchArguments":[{"group":{"start":7,"value":"\"E2E Product\"","children":[{"start":8,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"When I navigate to the cart page","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And I remove \"E2E Product\" from the cart","stepMatchArguments":[{"group":{"start":9,"value":"\"E2E Product\"","children":[{"start":10,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I see the empty cart message","stepMatchArguments":[]}]},
]; // bdd-data-end