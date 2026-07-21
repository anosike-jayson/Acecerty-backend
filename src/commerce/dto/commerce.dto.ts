import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType, PaymentProvider } from '../../common/enums';

export class OrderLineDto {
  @IsEnum(ItemType)
  itemType: ItemType;

  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class CreateOrderDto {
  // Provide explicit items, or omit to build the order from the user's cart.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items?: OrderLineDto[];
}

export class PayOrderDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}

export class AddCartItemDto {
  @IsEnum(ItemType)
  itemType: ItemType;

  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class SetCartDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items: AddCartItemDto[];
}
