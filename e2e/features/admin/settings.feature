@admin
Feature: Admin settings

  Scenario: Settings page renders store name field
    Given I am on the admin settings page
    Then I see an input for store name
    And the store name field has a non-empty value

  Scenario: Admin updates store name
    Given I am on the admin settings page
    When I change the store name to "E2E Store Updated"
    And I save the store settings
    Then I see a success indication for the store name update
