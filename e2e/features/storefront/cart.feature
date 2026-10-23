Feature: Storefront cart

  Scenario: Customer adds product to cart and sees it in cart page
    Given I am on the E2E Product detail page
    When I click the add to cart button
    And I navigate to the cart page
    Then I see "E2E Product" in the cart

  Scenario: Customer removes item shows empty cart
    Given I have "E2E Product" in my cart
    When I navigate to the cart page
    And I remove "E2E Product" from the cart
    Then I see the empty cart message
