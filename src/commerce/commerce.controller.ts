import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { OrdersService } from './orders.service';
import {
  AddCartItemDto,
  CreateOrderDto,
  PayOrderDto,
  SetCartDto,
} from './dto/commerce.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Commerce')
@Controller()
export class CommerceController {
  constructor(
    private readonly cart: CartService,
    private readonly orders: OrdersService,
  ) {}

  // ── Cart ──────────────────────────────────────────
  @Get('cart')
  viewCart(@CurrentUser() user: AuthUser) {
    return this.cart.view(user.id);
  }

  @Post('cart/items')
  addItem(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto) {
    return this.cart.addItem(user.id, dto);
  }

  @Put('cart')
  setCart(@CurrentUser() user: AuthUser, @Body() dto: SetCartDto) {
    return this.cart.replaceAll(user.id, dto);
  }

  @Delete('cart/items/:itemId')
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.cart.removeItem(user.id, itemId);
  }

  @Delete('cart')
  clearCart(@CurrentUser() user: AuthUser) {
    return this.cart.clear(user.id);
  }

  // ── Orders ────────────────────────────────────────
  @Post('orders')
  createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('orders/:id/pay')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.orders.pay(user.id, id, dto);
  }

  @Get('orders/:id')
  getOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getOwned(id, user.id);
  }

  @Get('me/orders')
  myOrders(@CurrentUser() user: AuthUser, @Query() pagination: PaginationDto) {
    return this.orders.listMine(user.id, pagination);
  }
}
