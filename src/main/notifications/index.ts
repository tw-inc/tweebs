import { Notification } from 'electron'

export function notifyUser(title: string, body: string): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title,
    body,
    silent: false
  })

  notification.show()
}

export function notifyDecisionNeeded(question: string): void {
  notifyUser('TWEEBS needs your input', question)
}

export function notifyProjectComplete(projectName: string): void {
  notifyUser('Project Complete!', `${projectName} is ready for you to check out.`)
}

export function notifyError(message: string): void {
  notifyUser('Something went wrong', message)
}
