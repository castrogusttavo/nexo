'use client'

import { CommentPlugin } from '@platejs/comment/react'
import { CommentLeaf } from '@/components/editor/ui/comment-node'

export const CommentKit = [CommentPlugin.withComponent(CommentLeaf)]
