import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client/core'
import { defineBoot } from '#q-app/wrappers'

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
})
const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('shonga_access_token')
  operation.setContext(({ headers = {} }) => ({
    headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  }))
  return forward(operation)
})

const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
})

export default defineBoot(({ app }) => {
  app.config.globalProperties.$apollo = apolloClient
  app.provide('apolloClient', apolloClient)
})

export { apolloClient }
