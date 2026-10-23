Feature: Storefront order tracking

  Scenario: Track page renders an order reference input
    Given I am on the storefront track page
    Then I see an order reference input field

  Scenario: Submitting a known order reference shows order status
    Given I have placed a test order and have its reference
    When I am on the storefront track page
    And I submit the test order reference
    Then I see the order status on the page

  Scenario: Submitting unknown reference shows not-found message
    Given I am on the storefront track page
    When I submit an unknown order reference
    Then I see an order not found message
