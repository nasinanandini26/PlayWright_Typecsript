@login
Feature: SauceDemo Login
  As a registered SauceDemo user
  I want to log in with my credentials
  So that I can access the product inventory

  Background:
    Given I am on the SauceDemo login page

  @TC_001 @smoke @positive
  Scenario: TC_001 - Successful login with a standard user
    When I log in with username "standard_user" and password "secret_sauce"
    Then I should be redirected to the inventory page

  @TC_002 @negative
  Scenario: TC_002 - Login is blocked for a locked out user
    When I log in with username "locked_out_user" and password "secret_sauce"
    Then I should see the error message "Epic sadface: Sorry, this user has been locked out."

  @TC_003 @negative
  Scenario: TC_003 - Login is rejected for an incorrect password
    When I log in with username "standard_user" and password "wrong_password"
    Then I should see the error message "Epic sadface: Username and password do not match any user in this service"

  @TC_004 @negative
  Scenario: TC_004 - Login is rejected when the username is blank
    When I log in with username "" and password "secret_sauce"
    Then I should see the error message "Epic sadface: Username is required"

  @TC_005 @datadriven
  Scenario Outline: TC_005 - Login attempts driven by CSV test data
    When I log in using test data for test case "<testCaseId>"
    Then the login result should match test case "<testCaseId>" expectations

    Examples:
      | testCaseId |
      | TC_005_01  |
      | TC_005_02  |
      | TC_005_03  |
