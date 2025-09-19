# Decster.ai Student Authentication System Documentation

## Overview

This document provides a comprehensive guide to understanding and integrating with Decster.ai's student authentication system. The system is designed to allow students to create accounts, take assessments, and access learning content through a secure, multi-tenant architecture.

## System Architecture

### Core Components

1. **Supabase Authentication** - Handles user authentication via magic links and Google OAuth
2. **Prisma Database** - PostgreSQL database with multi-tenant organization structure
3. **Next.js API Routes** - Server-side authentication and data management
4. **Middleware** - Route protection and access control
5. **Client-side Components** - React components for user interface

### Database Structure

The system uses a multi-tenant architecture where each organization (creator) has isolated data:

```sql
-- Core Tables
Organization (id, name, slug, createdAt)
User (id, email, firstName, lastName, userType, assessmentCompleted)
Membership (userId, organizationId, role)
UserAssessment (userId, organizationId, answers, status)
UserProfile (userId, organizationId, profileMarkdown, profileJson)
```

### User Types and Roles

- **UserType**: `CREATOR` or `STUDENT`
- **Roles**: `CREATOR_ADMIN`, `CREATOR_EDITOR`, `STUDENT`
- **Access Control**: Strict separation between creator and student functionality

## Student Authentication Flow

### 1. Student Signup Process

#### Step 1: Initial Signup
```typescript
// Client-side signup data
interface StudentSignupData {
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  communityAccess?: 'PUBLIC' | 'PRIVATE';
}
```

#### Step 2: Authentication Methods
Students can sign up using two methods:

**Magic Link Authentication:**
```typescript
// Send magic link to student's email
const result = await sendStudentMagicLink({
  email: 'student@example.com',
  firstName: 'John',
  lastName: 'Doe',
  organizationId: 'org-uuid',
  communityAccess: 'PUBLIC'
});
```

**Google OAuth Authentication:**
```typescript
// Sign up with Google
const result = await signUpWithGoogle({
  email: 'student@example.com',
  firstName: 'John',
  lastName: 'Doe',
  organizationId: 'org-uuid'
});
```

#### Step 3: Email Verification / OAuth Callback
After clicking the magic link or completing Google OAuth, students are redirected to:
```
/auth/student/callback?org={organizationId}
```

This page:
1. Verifies the authentication with Supabase
2. Creates or updates the user in the database
3. Creates a membership record linking the student to the organization
4. Redirects to the assessment page

### 2. Database Integration

#### User Creation Process
When a student completes authentication, the system:

1. **Creates User Record:**
```typescript
const user = await prisma.user.create({
  data: {
    email: authUser.email,
    firstName: signupData.firstName,
    lastName: signupData.lastName,
    name: `${firstName} ${lastName}`,
    userType: 'STUDENT',
    emailVerified: new Date(),
    assessmentCompleted: false
  }
});
```

2. **Creates Membership:**
```typescript
const membership = await prisma.membership.create({
  data: {
    userId: user.id,
    organizationId: organizationId,
    role: 'STUDENT'
  }
});
```

#### Organization Verification
Before creating accounts, the system verifies:
- Organization exists in database
- Organization ID is valid
- User isn't already enrolled in the organization

### 3. Assessment System

#### Assessment Flow
After successful authentication, students are directed to take an assessment:

1. **Assessment Creation:**
```typescript
// Create new assessment record
const assessment = await prisma.userAssessment.create({
  data: {
    organizationId: organizationId,
    userId: user.id,
    answers: {},
    status: 'DRAFT'
  }
});
```

2. **Progressive Saving:**
Students can save their progress as they complete the assessment:
```typescript
// Update existing draft
await prisma.userAssessment.update({
  where: { id: assessmentId },
  data: { 
    answers: newAnswers,
    status: 'DRAFT' // or 'SUBMITTED' when complete
  }
});
```

3. **Assessment Completion:**
When submitted, the system:
- Updates assessment status to 'SUBMITTED'
- Sets user.assessmentCompleted = true
- Triggers profile synthesis process

## API Endpoints for Widget Integration

### Authentication Endpoints

#### 1. Student Signup
```http
POST /api/auth/student-signup
Content-Type: application/json

{
  "email": "student@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "organizationId": "org-uuid",
  "communityAccess": "PUBLIC"
}
```

#### 2. Check Authentication Status
```http
GET /api/auth/check-status
Authorization: Bearer {supabase_token}
```

#### 3. Student Auth Callback
```http
POST /api/auth/student-callback
Content-Type: application/json

{
  "organizationId": "org-uuid",
  "additionalData": {
    "firstName": "John",
    "lastName": "Doe",
    "communityAccess": "PUBLIC"
  }
}
```

### Assessment Endpoints

#### 1. Get Student Assessment
```http
GET /api/student/assessments
Authorization: Bearer {supabase_token}
```

#### 2. Save Assessment Progress
```http
POST /api/student/assessments
Content-Type: application/json
Authorization: Bearer {supabase_token}

{
  "organizationId": "org-uuid",
  "answers": {
    "question1": "answer1",
    "question2": "answer2"
  },
  "status": "DRAFT" // or "SUBMITTED"
}
```

#### 3. Synthesize Assessment Profile
```http
POST /api/student/assessments/synthesize
Content-Type: application/json
Authorization: Bearer {supabase_token}

{
  "organizationId": "org-uuid"
}
```

## Widget Integration Guide

### Prerequisites

1. **Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_postgresql_connection_string
```

2. **Supabase Configuration:**
- Enable email authentication
- Configure Google OAuth provider
- Set up redirect URLs for your domain

### Integration Steps

#### Step 1: Initialize Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

#### Step 2: Implement Student Signup
```typescript
import { sendStudentMagicLink, signUpWithGoogle } from '@/lib/supabase-auth';

// Magic link signup
const handleMagicLinkSignup = async (signupData) => {
  const result = await sendStudentMagicLink(signupData);
  if (result.success) {
    // Show success message
    console.log('Magic link sent to email');
  } else {
    // Handle error
    console.error('Signup failed:', result.error);
  }
};

// Google OAuth signup
const handleGoogleSignup = async (signupData) => {
  const result = await signUpWithGoogle(signupData);
  if (result.success) {
    // Redirect to Google OAuth
  } else {
    // Handle error
    console.error('Google signup failed:', result.error);
  }
};
```

#### Step 3: Handle Authentication State
```typescript
import { useEffect, useState } from 'react';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};
```

#### Step 4: Implement Assessment Flow
```typescript
// Load existing assessment
const loadAssessment = async () => {
  const response = await fetch('/api/student/assessments', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  const data = await response.json();
  return data.data;
};

// Save assessment progress
const saveAssessment = async (answers, status = 'DRAFT') => {
  const response = await fetch('/api/student/assessments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      organizationId: organizationId,
      answers: answers,
      status: status
    })
  });
  return response.json();
};
```

### Security Considerations

#### 1. Multi-Tenant Isolation
- All database queries must include `organizationId` filter
- Row Level Security (RLS) policies enforce tenant isolation
- API routes validate organization membership before data access

#### 2. Access Control
```typescript
// Example: Check if user is student in organization
const membership = await getUserMembership(userId, organizationId);
if (!membership || membership.role !== 'STUDENT') {
  throw new Error('Student access required');
}
```

#### 3. Authentication Validation
```typescript
// All API routes validate authentication
const supabaseUser = await getSupabaseUser();
if (!supabaseUser) {
  return NextResponse.json(
    { success: false, error: 'Authentication required' },
    { status: 401 }
  );
}
```

## Error Handling

### Common Error Scenarios

1. **Authentication Errors:**
   - Invalid organization ID
   - User already enrolled
   - Email verification failed

2. **Database Errors:**
   - Organization not found
   - Duplicate user creation
   - Membership creation failed

3. **Assessment Errors:**
   - Assessment not found
   - Invalid assessment data
   - Profile synthesis failed

### Error Response Format
```typescript
{
  success: false,
  error: "Human-readable error message",
  code: "ERROR_CODE" // UNAUTHORIZED, FORBIDDEN, NOT_FOUND, etc.
}
```

## Testing the Integration

### 1. Test Student Signup
```bash
# Test magic link signup
curl -X POST http://localhost:3000/api/auth/student-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "Student",
    "organizationId": "your-org-id"
  }'
```

### 2. Test Assessment API
```bash
# Test assessment retrieval
curl -X GET http://localhost:3000/api/student/assessments \
  -H "Authorization: Bearer your-supabase-token"
```

### 3. Verify Database Records
```sql
-- Check user creation
SELECT * FROM "User" WHERE email = 'test@example.com';

-- Check membership
SELECT * FROM "Membership" WHERE "userId" = 'user-id';

-- Check assessment
SELECT * FROM "UserAssessment" WHERE "userId" = 'user-id';
```

## Troubleshooting

### Common Issues

1. **"Organization not found" Error:**
   - Verify organization ID exists in database
   - Check organization slug and name

2. **"Authentication required" Error:**
   - Verify Supabase configuration
   - Check if user completed email verification
   - Ensure proper token passing in API calls

3. **"Student access required" Error:**
   - Verify user has STUDENT userType
   - Check membership role is STUDENT
   - Ensure proper organization context

4. **Assessment Not Saving:**
   - Check if user has valid membership
   - Verify organizationId in request
   - Check database connection

### Debug Steps

1. **Check Authentication State:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);
```

2. **Verify Database Connection:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' }
});
console.log('User found:', user);
```

3. **Check Organization Membership:**
```typescript
const membership = await prisma.membership.findUnique({
  where: {
    userId_organizationId: {
      userId: userId,
      organizationId: organizationId
    }
  }
});
console.log('Membership:', membership);
```

## Conclusion

This authentication system provides a secure, scalable foundation for student onboarding and assessment. The multi-tenant architecture ensures data isolation while the Supabase integration provides robust authentication capabilities. When implementing your widget, focus on proper error handling, security validation, and following the established patterns for database access and API communication.

For additional support or questions about the integration, refer to the source code in the `/src/lib/supabase-auth.ts`, `/src/lib/auth-helpers.ts`, and `/src/app/api/student/` directories.
