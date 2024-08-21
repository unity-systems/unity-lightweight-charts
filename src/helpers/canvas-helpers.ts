/**
 * Fills rectangle's inner border (so, all the filled area is limited by the [x, x + width]*[y, y + height] region)
 * ```
 * (x, y)
 * O***********************|*****
 * |        border         |  ^
 * |   *****************   |  |
 * |   |               |   |  |
 * | b |               | b |  h
 * | o |               | o |  e
 * | r |               | r |  i
 * | d |               | d |  g
 * | e |               | e |  h
 * | r |               | r |  t
 * |   |               |   |  |
 * |   *****************   |  |
 * |        border         |  v
 * |***********************|*****
 * |                       |
 * |<------- width ------->|
 * ```
 *
 * @param ctx - Context to draw on
 * @param x - Left side of the target rectangle
 * @param y - Top side of the target rectangle
 * @param width - Width of the target rectangle
 * @param height - Height of the target rectangle
 * @param borderWidth - Width of border to fill, must be less than width and height of the target rectangle
 */
export function fillRectInnerBorder(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, borderWidth: number): void {
	// horizontal (top and bottom) edges
	ctx.fillRect(x + borderWidth, y, width - borderWidth * 2, borderWidth);
	ctx.fillRect(x + borderWidth, y + height - borderWidth, width - borderWidth * 2, borderWidth);
	// vertical (left and right) edges
	ctx.fillRect(x, y, borderWidth, height);
	ctx.fillRect(x + width - borderWidth, y, borderWidth, height);
}

export function clearRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, clearColor: string): void {
	ctx.save();
	ctx.globalCompositeOperation = 'copy';
	ctx.fillStyle = clearColor;
	ctx.fillRect(x, y, w, h);
	ctx.restore();
}

export type TopBottomRadii = [number, number];
export type LeftTopRightTopRightBottomLeftBottomRadii = [number, number, number, number];
export type DrawRoundRectRadii = number | TopBottomRadii | LeftTopRightTopRightBottomLeftBottomRadii;

function changeBorderRadius(borderRadius: LeftTopRightTopRightBottomLeftBottomRadii, offset: number): typeof borderRadius {
	return borderRadius.map((x: number) => x === 0 ? x : x + offset) as typeof borderRadius;
}

export function drawRoundRect(
	// eslint:disable-next-line:max-params
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	radii: LeftTopRightTopRightBottomLeftBottomRadii
): void {
	/**
	 * As of May 2023, all of the major browsers now support ctx.roundRect() so we should
	 * be able to switch to the native version soon.
	 */
	ctx.beginPath();
	if (ctx.roundRect) {
		ctx.roundRect(x, y, w, h, radii);
		return;
	}
	/*
	 * Deprecate the rest in v5.
	 */
	ctx.lineTo(x + w - radii[1], y);
	if (radii[1] !== 0) {
		ctx.arcTo(x + w, y, x + w, y + radii[1], radii[1]);
	}

	ctx.lineTo(x + w, y + h - radii[2]);
	if (radii[2] !== 0) {
		ctx.arcTo(x + w, y + h, x + w - radii[2], y + h, radii[2]);
	}

	ctx.lineTo(x + radii[3], y + h);
	if (radii[3] !== 0) {
		ctx.arcTo(x, y + h, x, y + h - radii[3], radii[3]);
	}

	ctx.lineTo(x, y + radii[0]);
	if (radii[0] !== 0) {
		ctx.arcTo(x, y, x + radii[0], y, radii[0]);
	}
}

export const ADD_BUTTON_SIZE = 21;
export const DRAG_HANDLE_SIZE = 12;

function drawCloseButton(ctx: CanvasRenderingContext2D, x: number, y: number, side: number, backgroundColor: string, textColor: string): any {
	ctx.fillStyle = backgroundColor;
	ctx.fillRect(x, y, side, side);

	const shift = 4;
	ctx.beginPath();
	ctx.moveTo(x + shift, y + shift);
	ctx.lineTo(x + side - shift, y + side - shift);
	ctx.moveTo(x + side - shift, y + shift);
	ctx.lineTo(x + shift, y + side - shift);
	ctx.strokeStyle = textColor || '#FFFFFF';
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function drawDragHandle(ctx: CanvasRenderingContext2D, x: number, y: number, side: number, backgroundColor: string, textColor: string): any {
	ctx.fillStyle = backgroundColor;
	const shift = 4;
	const radius = 1;
	ctx.beginPath();

	const height = side - shift * 2;
	const coords = [[0, 0], [0, height / 2], [0, height], [4, 0], [4, height / 2], [4, height]];
	coords.forEach((coord: number[]) => {
		ctx.moveTo(x + shift + coord[0], y + shift + coord[1]);
		ctx.arc(x + shift + coord[0], y + shift + coord[1], radius, 0, Math.PI * 2, true);
	});
	ctx.fillStyle = textColor;
	ctx.fill();
	ctx.strokeStyle = textColor || '#FFFFFF';
	ctx.lineWidth = 1;
	ctx.stroke();
}

/**
 * Draws a rounded rect with a border.
 *
 * This function assumes that the colors will be solid, without
 * any alpha. (This allows us to fix a rendering artefact.)
 *
 * @param outerBorderRadius - The radius of the border (outer edge)
 */
// eslint-disable-next-line max-params
export function drawRoundRectWithBorder(
	ctx: CanvasRenderingContext2D,
	left: number,
	top: number,
	width: number,
	height: number,
	backgroundColor: string,
	borderWidth: number = 0,
	outerBorderRadius: LeftTopRightTopRightBottomLeftBottomRadii = [0, 0, 0, 0],
	borderColor: string = '',
 textColor: string = '#FFFFFF',
 draggable: boolean = false,
 closeButton: boolean = false,
 iconColor?: string
): void {
	ctx.save();

	if (!borderWidth || !borderColor || borderColor === backgroundColor) {
		drawRoundRect(ctx, left, top, width, height, outerBorderRadius);
		ctx.fillStyle = backgroundColor;
		ctx.fill();
		ctx.restore();
		return;
	}

	const halfBorderWidth = borderWidth / 2;
	const dragHandleSize = draggable ? DRAG_HANDLE_SIZE : 0;
	const radii = changeBorderRadius(outerBorderRadius, - halfBorderWidth);

	drawRoundRect(ctx, left + halfBorderWidth, top + halfBorderWidth, width - borderWidth, height - borderWidth, radii);

	if (backgroundColor !== 'transparent') {
		const offsetRight = closeButton ? ADD_BUTTON_SIZE + dragHandleSize + 1 : 0;
		const fixedWidth = closeButton ? width + dragHandleSize : width;
		const innerRadii = changeBorderRadius(outerBorderRadius, - borderWidth);
		drawRoundRect(ctx, left + borderWidth - offsetRight, top + borderWidth, fixedWidth - borderWidth * 2, height - borderWidth * 2, innerRadii);

		ctx.fillStyle = backgroundColor;
		ctx.fill();
		if (draggable) {
			drawDragHandle(ctx, left + borderWidth - offsetRight, top, height, backgroundColor, textColor);
		}
		if (closeButton) {
			drawCloseButton(ctx, left + fixedWidth - height - offsetRight, top, height, backgroundColor, textColor);
		}
	}

	if (borderColor !== 'transparent') {
		ctx.lineWidth = borderWidth;
		ctx.strokeStyle = borderColor;
		ctx.closePath();
		ctx.stroke();
	}

	ctx.restore();
}

// eslint-disable-next-line max-params
export function clearRectWithGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, topColor: string, bottomColor: string): void {
	ctx.save();

	ctx.globalCompositeOperation = 'copy';
	const gradient = ctx.createLinearGradient(0, 0, 0, h);
	gradient.addColorStop(0, topColor);
	gradient.addColorStop(1, bottomColor);
	ctx.fillStyle = gradient;
	ctx.fillRect(x, y, w, h);

	ctx.restore();
}
