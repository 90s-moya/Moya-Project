package com.moya.service.category.command;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class CategoryInfoCommand {
    private UUID categoryId;
    private String categoryName;
}
