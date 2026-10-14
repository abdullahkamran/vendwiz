Feature: Storefront checkout

  Scenario: Checkout form shows contact and shipping fields
    Given I have "E2E Product" in my cart
    When I navigate to the checkout page
    Then I see fields for name, phone, email, and address

  Scenario: Valid checkout submission redirects to confirmation with ref
    Given I have "E2E Product" in my cart
    When I complete the checkout with valid details
    Then I am on the confirmation page with a ref parameter
    And the confirmation page shows the order reference

  Scenario: Checkout with empty cart redirects away
    Given my cart is empty
    When I navigate to the checkout page
    Then I am redirected away from checkout
