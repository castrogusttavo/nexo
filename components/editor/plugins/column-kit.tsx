'use client'

import { ColumnPlugin, ColumnItemPlugin } from '@platejs/layout/react'
import { ColumnElement, ColumnGroupElement } from "@/components/ui/column-node"

export const ColumnKit = [
  ColumnPlugin.withComponent(ColumnGroupElement),
  ColumnItemPlugin.withComponent(ColumnElement),
]
