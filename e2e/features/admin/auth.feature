Feature: Admin authentication

  Scenario: Unauthenticated admin redirect
    When I visit the admin panel without being logged in
    Then I am redirected to the login page
    And the login page has email and password input fields

  Scenario: Admin logs in
    Given I am on the login page
    When I log in with admin credentials
    Then I land on the admin dashboard

  @admin
  Scenario: Admin logs out
    Given I am on the admin dashboard
    When I click the sign out button
    Then I am redirected to the login page

  @admin
  Scenario: Admin API sign-out clears session
    Given I am on the admin dashboard
    When I sign out via the API
    And I navigate to the admin panel
    Then I am redirected to the login page
