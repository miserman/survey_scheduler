describe('login process', () => {
  it('should sign in as expected in development mode', () => {
    cy.visit('/')
    cy.get('a').contains('Sign in').click()
    cy.get('p', {timeout: 2000}).should('contain', 'established session')
  })
})
