import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D, MediaCoordinatesRenderingScope } from 'fancy-canvas';

import { ADD_BUTTON_SIZE, drawRoundRectWithInnerBorder } from '../helpers/canvas-helpers';

import { TextWidthCache } from '../model/text-width-cache';

import {
	IPriceAxisViewRenderer,
	PriceAxisViewRendererCommonData,
	PriceAxisViewRendererData,
	PriceAxisViewRendererOptions,
} from './iprice-axis-view-renderer';

interface Geometry {
	alignRight: boolean;

	// bitmap coordinate space geometry
	bitmap: {
		yTop: number;
		yMid: number;
		yBottom: number;
		totalWidth: number;
		totalHeight: number;
		radius: number;
		horzBorder: number;
		xOutside: number;
		xInside: number;
		xTick: number;
		tickHeight: number;
		right: number;
	};

	// media coordinate space geometry
	media: {
		yTop: number;
		yBottom: number;
		xText: number;
		textMidCorrection: number;
	};
}

const CLOSE_BUTTON_SIZE = 16;

const ICON_SIZE = 13;

export class PriceAxisViewRenderer implements IPriceAxisViewRenderer {
	private _data!: PriceAxisViewRendererData;
	private _commonData!: PriceAxisViewRendererCommonData;
	private _iconColor?: string;

	public constructor(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData) {
		this.setData(data, commonData);
	}

	public setData(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData): void {
		this._data = data;
		this._commonData = commonData;
	}

	public height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine: boolean): number {
		if (!this._data.visible) {
			return 0;
		}

		return rendererOptions.fontSize + rendererOptions.paddingTop + rendererOptions.paddingBottom;
	}

    // eslint-disable-next-line max-params
	public draw(
		target: CanvasRenderingTarget2D,
		rendererOptions: PriceAxisViewRendererOptions,
		textWidthCache: TextWidthCache,
		align: 'left' | 'right',
  draggable: boolean,
  closeButton: boolean,
  iconColor?: string
	): void {
		if (!this._data.visible || this._data.text.length === 0) {
			return;
		}

		this._iconColor = iconColor;
		const textColor = this._data.color;
		const backgroundColor = this._commonData.background;

		const geometry = target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
			const ctx = scope.context;
			ctx.font = rendererOptions.font;
			const geom = this._calculateGeometry(scope, rendererOptions, textWidthCache, align, closeButton);
			const gb = geom.bitmap;

			const drawLabelBody = (labelBackgroundColor: string, labelBorderColor?: string): void => {
				if (geom.alignRight) {
					drawRoundRectWithInnerBorder(
						ctx,
						gb.xOutside,
						gb.yTop,
						gb.totalWidth,
						gb.totalHeight,
						labelBackgroundColor,
						gb.horzBorder,
						[gb.radius, 0, 0, gb.radius],
						labelBorderColor,
      textColor,
      draggable,
      closeButton,
      iconColor
					);
				} else {
					drawRoundRectWithInnerBorder(
						ctx,
						gb.xInside,
						gb.yTop,
						gb.totalWidth,
						gb.totalHeight,
						labelBackgroundColor,
						gb.horzBorder,
						[0, gb.radius, gb.radius, 0],
						labelBorderColor,
      textColor,
      draggable,
      closeButton,
      iconColor
					);
				}
			};

			// draw border
			// draw label background
			drawLabelBody(backgroundColor, 'transparent');
			// draw tick
			if (this._data.tickVisible) {
				ctx.fillStyle = textColor;
				ctx.fillRect(gb.xInside, gb.yMid, gb.xTick - gb.xInside, gb.tickHeight);
			}
			// draw label border above the tick
			drawLabelBody('transparent', backgroundColor);

			// draw separator
			if (this._data.borderVisible) {
				ctx.fillStyle = rendererOptions.paneBackgroundColor;
				ctx.fillRect(
					geom.alignRight ? gb.right - gb.horzBorder : 0,
					gb.yTop,
					gb.horzBorder,
					gb.yBottom - gb.yTop
				);
			}

			return geom;
		});

		target.useMediaCoordinateSpace(({ context: ctx }: MediaCoordinatesRenderingScope) => {
			const gm = geometry.media;
			if (iconColor) {
				ctx.font = `${ICON_SIZE}px icomoon`;
				ctx.textAlign = 'left';
				ctx.textBaseline = 'middle';
				ctx.fillStyle = iconColor;
				const xOffset = this._data.moveTextToInvisibleTick && closeButton ? gm.xText - CLOSE_BUTTON_SIZE - ADD_BUTTON_SIZE : gm.xText;
				ctx.fillText('\ue966', xOffset - ICON_SIZE, (gm.yTop + gm.yBottom) / 2 + gm.textMidCorrection - 1);
				return;
			}
			ctx.font = rendererOptions.font;
			ctx.textAlign = geometry.alignRight ? 'right' : 'left';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = textColor;
			const xOffset = this._data.moveTextToInvisibleTick && closeButton ? gm.xText - CLOSE_BUTTON_SIZE - ADD_BUTTON_SIZE : gm.xText;
			ctx.fillText(this._data.text, xOffset, (gm.yTop + gm.yBottom) / 2 + gm.textMidCorrection - 1);
		});
	}

	private _calculateGeometry(
		scope: BitmapCoordinatesRenderingScope,
		rendererOptions: PriceAxisViewRendererOptions,
		textWidthCache: TextWidthCache,
		align: 'left' | 'right',
  closeButton: boolean
	): Geometry {
		const { context: ctx, bitmapSize, mediaSize, horizontalPixelRatio, verticalPixelRatio } = scope;
		const tickSize = (this._data.tickVisible || !this._data.moveTextToInvisibleTick) ? rendererOptions.tickLength : 0;
		const horzBorder = this._data.separatorVisible ? rendererOptions.borderSize : 0;
		const paddingTop = rendererOptions.paddingTop + this._commonData.additionalPaddingTop;
		const paddingBottom = rendererOptions.paddingBottom + this._commonData.additionalPaddingBottom;
		const paddingInner = rendererOptions.paddingInner;
		const paddingOuter = rendererOptions.paddingOuter;
		const text = this._data.text;
		const actualTextHeight = rendererOptions.fontSize;
		const textMidCorrection = textWidthCache.yMidCorrection(ctx, text);

		const textWidth = this._iconColor ? ICON_SIZE : Math.ceil(textWidthCache.measureText(ctx, text));

		const totalHeight = actualTextHeight + paddingTop + paddingBottom;

		const totalWidth = rendererOptions.borderSize + paddingInner + paddingOuter + textWidth + tickSize + (closeButton ? CLOSE_BUTTON_SIZE : 0);

		const tickHeightBitmap = Math.max(1, Math.floor(verticalPixelRatio));
		let totalHeightBitmap = Math.round(totalHeight * verticalPixelRatio);
		if (totalHeightBitmap % 2 !== tickHeightBitmap % 2) {
			totalHeightBitmap += 1;
		}
		const horzBorderBitmap = horzBorder > 0 ? Math.max(1, Math.floor(horzBorder * horizontalPixelRatio)) : 0;
		const totalWidthBitmap = Math.round(totalWidth * horizontalPixelRatio);
		// tick overlaps scale border
		const tickSizeBitmap = Math.round(tickSize * horizontalPixelRatio);

		const yMid = this._commonData.fixedCoordinate ?? this._commonData.coordinate;
		const yMidBitmap = Math.round(yMid * verticalPixelRatio) - Math.floor(verticalPixelRatio * 0.5);
		const yTopBitmap = Math.floor(yMidBitmap + tickHeightBitmap / 2 - totalHeightBitmap / 2);
		const yBottomBitmap = yTopBitmap + totalHeightBitmap;

		const alignRight = align === 'right';

		const xInside = alignRight ? mediaSize.width - horzBorder : horzBorder;
		const xInsideBitmap = alignRight ? bitmapSize.width - horzBorderBitmap : horzBorderBitmap;

		let xOutsideBitmap: number;
		let xTickBitmap: number;
		let xText: number;

		if (alignRight) {
			// 2               1
			//
			//              6  5
			//
			// 3               4
			xOutsideBitmap = xInsideBitmap - totalWidthBitmap;
			xTickBitmap = xInsideBitmap - tickSizeBitmap;
			xText = xInside - tickSize - paddingInner - horzBorder;
		} else {
			// 1               2
			//
			// 6  5
			//
			// 4               3
			xOutsideBitmap = xInsideBitmap + totalWidthBitmap;
			xTickBitmap = xInsideBitmap + tickSizeBitmap;
			xText = xInside + tickSize + paddingInner;
		}

		return {
			alignRight,
			bitmap: {
				yTop: yTopBitmap,
				yMid: yMidBitmap,
				yBottom: yBottomBitmap,
				totalWidth: totalWidthBitmap,
				totalHeight: totalHeightBitmap,
				// TODO: it is better to have different horizontal and vertical radii
				radius: 2 * horizontalPixelRatio,
				horzBorder: horzBorderBitmap,
				xOutside: xOutsideBitmap,
				xInside: xInsideBitmap,
				xTick: xTickBitmap,
				tickHeight: tickHeightBitmap,
				right: bitmapSize.width,
			},
			media: {
				yTop: yTopBitmap / verticalPixelRatio,
				yBottom: yBottomBitmap / verticalPixelRatio,
				xText,
				textMidCorrection,
			},
		};
	}
}
