Feature: Storefront customer authentication

  Scenario: Register page renders name, email, and password fields
    Given I am on the registration page
    Then I see input fields for name, email, and password

  Scenario: Registering with a unique email succeeds
    Given I am on the registration page
    When I register with a unique customer email and password
    Then I am on an authenticated page after registration

  Scenario: Customer logout navigates to login
    Given I have registered and am logged in as a customer
    When I sign out as a customer
    Then the current page is the login page
