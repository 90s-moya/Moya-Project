package com.moya.interfaces.api.category;

import com.moya.domain.category.Category;
import com.moya.service.category.CategoryService;
import com.moya.service.category.command.CategoryInfoCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/category")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;
    @GetMapping("")
    public ResponseEntity<List<CategoryInfoCommand>> getAllCategories() {
        List<CategoryInfoCommand> categories = categoryService.findAll();
        return ResponseEntity.ok(categories);
    }
}
