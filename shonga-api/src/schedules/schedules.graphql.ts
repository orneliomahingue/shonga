import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { scheduleMappers, schedulesService } from './schedules.service.js'

export const schedulesTypeDefs = gql`
  enum TimeOffType { VACATION ABSENCE BLOCKED }
  input WorkingHourInput { dayOfWeek: Int!, startTime: String!, endTime: String! }
  input TimeOffInput { employeeId: ID!, startsAt: String!, endsAt: String!, type: TimeOffType!, reason: String }
  input AvailabilityInput { employeeId: ID!, serviceId: ID!, date: String!, stepMin: Int = 30 }
  type WorkingHour { id: ID!, dayOfWeek: Int!, startTime: String!, endTime: String! }
  type EmployeeTimeOff { id: ID!, startsAt: String!, endsAt: String!, type: TimeOffType!, reason: String }
  type EmployeeSchedule { workingHours: [WorkingHour!]!, timeOff: [EmployeeTimeOff!]! }
  type AvailableSlot { startsAt: String!, endsAt: String!, label: String! }
  extend type Query { employeeSchedule(employeeId: ID!): EmployeeSchedule!, availableSlots(input: AvailabilityInput!): [AvailableSlot!]! }
  extend type Mutation { setEmployeeWorkingHours(employeeId: ID!, hours: [WorkingHourInput!]!): [WorkingHour!]!, addEmployeeTimeOff(input: TimeOffInput!): EmployeeTimeOff!, removeEmployeeTimeOff(id: ID!): Boolean! }
`
export const schedulesResolvers = {
  Query: { employeeSchedule: (_: unknown, { employeeId }: { employeeId: string }, context: GraphQLContext) => schedulesService.get(employeeId, context.authUser), availableSlots: (_: unknown, { input }: { input: unknown }) => schedulesService.availableSlots(input) },
  Mutation: { setEmployeeWorkingHours: (_: unknown, args: { employeeId: string; hours: unknown }, context: GraphQLContext) => schedulesService.setWorkingHours(args.employeeId, args.hours, context.authUser), addEmployeeTimeOff: (_: unknown, { input }: { input: unknown }, context: GraphQLContext) => schedulesService.addTimeOff(input, context.authUser), removeEmployeeTimeOff: (_: unknown, { id }: { id: string }, context: GraphQLContext) => schedulesService.removeTimeOff(id, context.authUser) },
  WorkingHour: { startTime: (hour: { startMinute: number }) => scheduleMappers.time(hour.startMinute), endTime: (hour: { endMinute: number }) => scheduleMappers.time(hour.endMinute) },
  EmployeeTimeOff: { startsAt: (item: { startsAt: Date }) => item.startsAt.toISOString(), endsAt: (item: { endsAt: Date }) => item.endsAt.toISOString() },
}
