import { Image as ImageIcon, MousePointerClick, SeparatorHorizontal, Type } from 'lucide-react'
import { createSectionId } from '@/config/defaultLayout'
import type { FlexibleBlock, FlexibleBlockType } from '@/types/builder'
import { TextBlockEditor, TextBlockRenderer } from './blocks/TextBlock'
import { ImageBlockEditor, ImageBlockRenderer } from './blocks/ImageBlock'
import { ButtonBlockEditor, ButtonBlockRenderer } from './blocks/ButtonBlock'
import { SpacerBlockEditor, SpacerBlockRenderer } from './blocks/SpacerBlock'

export interface BlockEditorProps<TBlock> {
  block: TBlock
  onChange: (block: TBlock) => void
  shopId: string
  sectionId: string
}

export interface BlockDefinition {
  label: string
  icon: typeof Type
  createDefault: () => FlexibleBlock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: React.ComponentType<BlockEditorProps<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer: React.ComponentType<{ block: any }>
}

export const BLOCK_REGISTRY: Record<FlexibleBlockType, BlockDefinition> = {
  text: {
    label: 'Texte',
    icon: Type,
    createDefault: () => ({ id: createSectionId('block-text'), type: 'text', heading: '', body: '', align: 'left' }),
    Editor: TextBlockEditor,
    Renderer: TextBlockRenderer,
  },
  image: {
    label: 'Image',
    icon: ImageIcon,
    createDefault: () => ({ id: createSectionId('block-image'), type: 'image', imageUrl: null, caption: '' }),
    Editor: ImageBlockEditor,
    Renderer: ImageBlockRenderer,
  },
  button: {
    label: 'Bouton',
    icon: MousePointerClick,
    createDefault: () => ({ id: createSectionId('block-button'), type: 'button', label: "Voir l'offre", url: '/catalogue', style: 'solid' }),
    Editor: ButtonBlockEditor,
    Renderer: ButtonBlockRenderer,
  },
  spacer: {
    label: 'Espacement',
    icon: SeparatorHorizontal,
    createDefault: () => ({ id: createSectionId('block-spacer'), type: 'spacer', height: 'md' }),
    Editor: SpacerBlockEditor,
    Renderer: SpacerBlockRenderer,
  },
}
