import { ColumnElementStatic, ColumnGroupElementStatic } from '@/components/ui/column-node-static'
import { BaseColumnPlugin, BaseColumnItemPlugin } from '@platejs/layout'

export const BaseColumnKit = [
  BaseColumnPlugin.withComponent(ColumnGroupElementStatic),
  BaseColumnItemPlugin.withComponent(ColumnElementStatic),
]
