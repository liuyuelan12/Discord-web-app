Updating Data
You can update data in Next.js using React's Server Functions. This page will go through how you can create and invoke Server Functions.

What are Server Functions?
A Server Function is an asynchronous function that runs on the server. They can be called from client through a network request, which is why they must be asynchronous.

In an action or mutation context, they are also called Server Actions.

By convention, a Server Action is an async function used with startTransition. This happens automatically when the function is:

Passed to a <form> using the action prop.
Passed to a <button> using the formAction prop.
In Next.js, Server Actions integrate with the framework's caching architecture. When an action is invoked, Next.js can return both the updated UI and new data in a single server roundtrip.

Behind the scenes, actions use the POST method, and only this HTTP method can invoke them.

Creating Server Functions
A Server Function can be defined by using the use server directive. You can place the directive at the top of an asynchronous function to mark the function as a Server Function, or at the top of a separate file to mark all exports of that file.

app/lib/actions.ts
TypeScript

TypeScript

export async function createPost(formData: FormData) {
  'use server'
  const title = formData.get('title')
  const content = formData.get('content')
 
  // Update data
  // Revalidate cache
}
 
export async function deletePost(formData: FormData) {
  'use server'
  const id = formData.get('id')
 
  // Update data
  // Revalidate cache
}
Server Components
Server Functions can be inlined in Server Components by adding the "use server" directive to the top of the function body:

app/page.tsx
TypeScript

TypeScript

export default function Page() {
  // Server Action
  async function createPost(formData: FormData) {
    'use server'
    // ...
  }
 
  return <></>
}
Good to know: Server Components support progressive enhancement by default, meaning forms that call Server Actions will be submitted even if JavaScript hasn't loaded yet or is disabled.

Client Components
It's not possible to define Server Functions in Client Components. However, you can invoke them in Client Components by importing them from a file that has the "use server" directive at the top of it:

app/actions.ts
TypeScript

TypeScript

'use server'
 
export async function createPost() {}
app/ui/button.tsx
TypeScript

TypeScript

'use client'
 
import { createPost } from '@/app/actions'
 
export function Button() {
  return <button formAction={createPost}>Create</button>
}
Good to know: In Client Components, forms invoking Server Actions will queue submissions if JavaScript isn't loaded yet, and will be prioritized for hydration. After hydration, the browser does not refresh on form submission.

Passing actions as props
You can also pass an action to a Client Component as a prop:


<ClientComponent updateItemAction={updateItem} />
app/client-component.tsx
TypeScript

TypeScript

'use client'
 
export default function ClientComponent({
  updateItemAction,
}: {
  updateItemAction: (formData: FormData) => void
}) {
  return <form action={updateItemAction}>{/* ... */}</form>
}
Invoking Server Functions
There are two main ways you can invoke a Server Function:

Forms in Server and Client Components
Event Handlers and useEffect in Client Components
Good to know: Server Functions are designed for server-side mutations. The client currently dispatches and awaits them one at a time. This is an implementation detail and may change. If you need parallel data fetching, use data fetching in Server Components, or perform parallel work inside a single Server Function or Route Handler.

Forms
React extends the HTML <form> element to allow Server Function to be invoked with the HTML action prop.

When invoked in a form, the function automatically receives the FormData object. You can extract the data using the native FormData methods:

app/ui/form.tsx
TypeScript

TypeScript

import { createPost } from '@/app/actions'
 
export function Form() {
  return (
    <form action={createPost}>
      <input type="text" name="title" />
      <input type="text" name="content" />
      <button type="submit">Create</button>
    </form>
  )
}
app/actions.ts
TypeScript

TypeScript

'use server'
 
export async function createPost(formData: FormData) {
  const title = formData.get('title')
  const content = formData.get('content')
 
  // Update data
  // Revalidate cache
}
Event Handlers
You can invoke a Server Function in a Client Component by using event handlers such as onClick.

app/like-button.tsx
TypeScript

TypeScript

'use client'
 
import { incrementLike } from './actions'
import { useState } from 'react'
 
export default function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
 
  return (
    <>
      <p>Total Likes: {likes}</p>
      <button
        onClick={async () => {
          const updatedLikes = await incrementLike()
          setLikes(updatedLikes)
        }}
      >
        Like
      </button>
    </>
  )
}
Examples
Showing a pending state
While executing a Server Function, you can show a loading indicator with React's useActionState hook. This hook returns a pending boolean:

app/ui/button.tsx
TypeScript

TypeScript

'use client'
 
import { useActionState, startTransition } from 'react'
import { createPost } from '@/app/actions'
import { LoadingSpinner } from '@/app/ui/loading-spinner'
 
export function Button() {
  const [state, action, pending] = useActionState(createPost, false)
 
  return (
    <button onClick={() => startTransition(action)}>
      {pending ? <LoadingSpinner /> : 'Create Post'}
    </button>
  )
}
Revalidating
After performing an update, you can revalidate the Next.js cache and show the updated data by calling revalidatePath or revalidateTag within the Server Function:

app/lib/actions.ts
TypeScript

TypeScript

import { revalidatePath } from 'next/cache'
 
export async function createPost(formData: FormData) {
  'use server'
  // Update data
  // ...
 
  revalidatePath('/posts')
}
Redirecting
You may want to redirect the user to a different page after performing an update. You can do this by calling redirect within the Server Function.

app/lib/actions.ts
TypeScript

TypeScript

'use server'
 
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
 
export async function createPost(formData: FormData) {
  // Update data
  // ...
 
  revalidatePath('/posts')
  redirect('/posts')
}
Calling redirect throws a framework handled control-flow exception. Any code after it won't execute. If you need fresh data, call revalidatePath or revalidateTag beforehand.

Cookies
You can get, set, and delete cookies inside a Server Action using the cookies API.

When you set or delete a cookie in a Server Action, Next.js re-renders the current page and its layouts on the server so the UI reflects the new cookie value.

Good to know: The server update applies to the current React tree, re-rendering, mounting, or unmounting components, as needed. Client state is preserved for re-rendered components, and effects re-run if their dependencies changed.

app/actions.ts
TypeScript

TypeScript

'use server'
 
import { cookies } from 'next/headers'
 
export async function exampleAction() {
  const cookieStore = await cookies()
 
  // Get cookie
  cookieStore.get('name')?.value
 
  // Set cookie
  cookieStore.set('name', 'Delba')
 
  // Delete cookie
  cookieStore.delete('name')
}
useEffect
You can use the React useEffect hook to invoke a Server Action when the component mounts or a dependency changes. This is useful for mutations that depend on global events or need to be triggered automatically. For example, onKeyDown for app shortcuts, an intersection observer hook for infinite scrolling, or when the component mounts to update a view count:

app/view-count.tsx
TypeScript

TypeScript

'use client'
 
import { incrementViews } from './actions'
import { useState, useEffect, useTransition } from 'react'
 
export default function ViewCount({ initialViews }: { initialViews: number }) {
  const [views, setViews] = useState(initialViews)
  const [isPending, startTransition] = useTransition()
 
  useEffect(() => {
    startTransition(async () => {
      const updatedViews = await incrementViews()
      setViews(updatedViews)
    })
  }, [])
 
  // You can use `isPending` to give users feedback
  return <p>Total Views: {views}</p>
