# Security Specification - CAI Manager

## 1. Data Invariants
- A sheet must belong to the authenticated user attempting to write it.
- `updatedAt` must be a server timestamp.
- IDs must be alphanumeric strings.

## 2. The "Dirty Dozen" Payloads (Examples to Reject)
1. Write to `users/other_user_id` by `user_a`.
2. Write to `users/user_a/sheets/sheet1` with `name` of 1MB string.
3. Write to `users/user_a/sheets/sheet1` with invalid `updatedAt` (future/past client time).
4. Update `users/user_a/sheets/sheet1` changing `name` but not matching doc ID.
5. Write to `users/user_a/sheets/sheet1` with extra hidden field `isAdmin: true`.
6. Read `users/victim_user/sheets/private_sheet` by attacker.
7. List `users/victim_user/sheets` by attacker.
8. Delete `users/victim_user/sheets/sheet1` by attacker.
9. Injecting invalid path character in sheet name.
10. Creating a sheet with missing required `data` field.
11. Updating a terminal state (if any, though none defined yet).
12. Resource poisoning: doc ID of 2KB.

## 3. Test Runner (Draft)
I will implement rules that handle these cases.
